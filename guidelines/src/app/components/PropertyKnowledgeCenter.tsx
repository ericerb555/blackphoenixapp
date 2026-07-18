/**
 * PropertyAI Enterprise — Phase 4: Digital Knowledge Center
 * Premium guide library with AI Learning Companion.
 * Each guide has chapters, checklists, and a contextual AI chat companion
 * trained on that guide's content. NH-aware throughout.
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  BookOpen, Bot, Send, X, ChevronRight, ChevronLeft,
  Search, Star, Clock, Users, CheckSquare, Download,
  Bookmark, Share2, MessageSquare, Lightbulb, FileText,
  Home, Wrench, Building2, Shield, DollarSign, Zap,
  List, BarChart3, Target, ArrowUpRight, CheckCircle,
  AlertTriangle, RefreshCw, ChevronDown, ChevronUp,
  Printer, Tag, Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type Audience = 'homeowner' | 'landlord' | 'commercial' | 'condo_hoa' | 'contractor' | 'diy';
type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

interface Checklist { item: string; nhNote?: string; }

interface Chapter {
  id: string;
  title: string;
  content: string[]; // paragraphs
  checklist?: Checklist[];
  tip?: string;
  nhNote?: string;
}

interface Guide {
  id: string;
  title: string;
  subtitle: string;
  audience: Audience[];
  icon: any;
  color: string;
  bg: string;
  difficulty: Difficulty;
  readTime: number; // minutes
  version: string;
  updated: string;
  description: string;
  chapters: Chapter[];
  aiPersona: string; // name for AI companion
  aiContext: string; // system context for AI
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  ts: string;
}

// ─── Guide catalog ─────────────────────────────────────────────────────────────

const GUIDES: Guide[] = [
  // ── Homeowner ──────────────────────────────────────────────────────────────
  {
    id: 'first-time-homeowner',
    title: 'First-Time Homeowner Guide',
    subtitle: 'Everything you need in your first year of ownership',
    audience: ['homeowner'],
    icon: Home, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20',
    difficulty: 'Beginner', readTime: 22, version: '2.1', updated: 'March 2025',
    description: 'A complete roadmap for new homeowners covering maintenance schedules, budgeting, insurance, and building systems — written for NH property owners.',
    aiPersona: 'HomeAI',
    aiContext: 'first-time homeowner guide covering maintenance, budgets, insurance, and building systems in New Hampshire',
    chapters: [
      {
        id: 'ch1', title: 'Your First 30 Days',
        content: [
          'The first month of homeownership is about orientation — learning your property before problems arise. Start by locating every shut-off valve, circuit breaker, and safety system in the house. Document their locations with photos and store them in your PropertyAI document library.',
          'In New Hampshire, the priority is always your heating system. Before winter, confirm your furnace or boiler has been serviced within the past 12 months. Eversource NH offers free energy audits for new homeowners — schedule one within your first 60 days to identify efficiency gaps and qualify for rebates.',
          'Introduce yourself to your neighbors and local utility contacts. Know your water company, oil or gas supplier, and who to call in an emergency. Post the numbers somewhere visible in your home.',
        ],
        checklist: [
          { item: 'Locate main water shut-off valve', nhNote: 'In NH, this is often in the basement or utility room near the foundation.' },
          { item: 'Photograph and label every circuit breaker' },
          { item: 'Test all smoke and CO detectors' },
          { item: 'Schedule Eversource NH free energy audit', nhNote: 'Available to all NH residential customers — call 1-800-662-7764.' },
          { item: 'Locate heating system and check filter/last service date' },
          { item: 'Find septic system records (if applicable)', nhNote: 'NH requires septic pumping typically every 3–5 years; records should have transferred at closing.' },
        ],
        tip: 'Create a home binder (physical or digital) with every appliance manual, warranty, utility account number, and contractor contact you gather in your first month.',
      },
      {
        id: 'ch2', title: 'Your Maintenance Calendar',
        content: [
          'NH\'s climate demands a proactive seasonal maintenance schedule. The state experiences hard freeze winters, wet springs with freeze-thaw cycles, humid summers, and dry falls — each season brings specific risks to your property.',
          'Spring is your inspection season. After the ground thaws, inspect your foundation for winter cracking, check gutters and downspouts, and have your air conditioning serviced before summer demand spikes pricing. NH\'s frost line is 48–60 inches, which means freeze-thaw cycles can shift foundations and crack driveways annually.',
          'Fall is your winterization season. By October 15th in most NH locations, your heating system should be serviced, outdoor pipes drained and insulated, and weatherstripping checked. NH winters can push -20°F in northern regions — never assume a mild forecast will hold.',
        ],
        checklist: [
          { item: 'Spring: inspect foundation for winter cracks' },
          { item: 'Spring: clean and inspect gutters' },
          { item: 'Spring: service AC before summer', nhNote: 'Eversource NH central AC rebates available through the Energy Star program.' },
          { item: 'Fall: service heating system by October 1', nhNote: 'NH heating oil delivery can lag during cold snaps — top off your tank early.' },
          { item: 'Fall: drain and insulate outdoor hose bibs' },
          { item: 'Fall: check weatherstripping on all exterior doors' },
          { item: 'Winter: keep heat at minimum 55°F if away', nhNote: 'NH pipes typically freeze when exterior temps hit -10°F — insurance policies may require minimum temp.' },
        ],
        tip: 'Set recurring calendar reminders for each seasonal task. Use PropertyAI\'s Capital Planning tab to track when each major system is due for replacement.',
        nhNote: 'NH RSA 477:27 requires sellers to disclose known material defects — review your property disclosure document and flag any items that may need attention.',
      },
      {
        id: 'ch3', title: 'Understanding Your Building Systems',
        content: [
          'Your home\'s major systems are your largest capital investments after the structure itself. Understanding the expected lifespan and maintenance requirements of each system helps you budget proactively and avoid emergency repair costs.',
          'Heating systems in NH typically use oil (most common statewide), natural gas (available in southern NH cities), propane, or heat pumps. Oil and gas furnaces have 18–25 year lifespans with annual servicing. Heat pumps last 15–20 years and are increasingly popular due to NH net metering and Eversource rebates. Boilers can last 25–35 years with proper maintenance.',
          'Your roof is your first line of defense against NH weather. Asphalt shingles typically last 20–30 years; architectural shingles 30–40. Ice dams are a common NH problem caused by heat loss through the roof — proper attic insulation is the long-term fix. Metal roofing is increasingly popular in NH for its snow-shedding properties.',
        ],
        checklist: [
          { item: 'Record installation year for HVAC, water heater, and roof in PropertyAI' },
          { item: 'Schedule annual HVAC service contract' },
          { item: 'Inspect attic insulation for NH ice dam prevention' },
          { item: 'Check water heater anode rod every 3 years' },
          { item: 'Test sump pump (if applicable) before spring melt' },
        ],
        tip: 'Log every service visit in PropertyAI\'s Document Intelligence. When you sell, a complete maintenance history adds demonstrated value and reduces buyer negotiation leverage.',
      },
      {
        id: 'ch4', title: 'Budgeting for Homeownership',
        content: [
          'The standard rule of thumb — budget 1–2% of your home\'s value annually for maintenance — is a reasonable starting point, but NH-specific factors can push costs higher. NH\'s climate adds heating costs, ice dam remediation risk, and higher winterization labor costs than national averages suggest.',
          'Build an emergency fund specifically for your home, separate from your personal emergency fund. A minimum of $5,000–$10,000 for a typical NH single-family home is a practical target. Major system failures — furnace, roof, water heater — should never require you to go into debt if avoidable.',
          'Track every home expense in a dedicated category. NH has no state income tax on wages but does tax interest and dividends — mortgage interest deductions and energy efficiency credits (federal) can meaningfully impact your annual return.',
        ],
        checklist: [
          { item: 'Open a dedicated home savings account' },
          { item: 'Fund 1% of home value annually ($3,000 on a $300K home)' },
          { item: 'Track all home improvement receipts for capital gains basis', nhNote: 'NH has no capital gains tax, but federal basis tracking still applies for federal returns.' },
          { item: 'File for federal energy efficiency tax credits after qualifying upgrades' },
          { item: 'Review homeowner\'s insurance annually — rebuild costs change' },
        ],
      },
    ],
  },
  // ── DIY ────────────────────────────────────────────────────────────────────
  {
    id: 'diy-repair-guide',
    title: 'DIY Home Repair Guide',
    subtitle: 'Fix it yourself — safely and effectively',
    audience: ['homeowner', 'diy'],
    icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20',
    difficulty: 'Intermediate', readTime: 28, version: '1.8', updated: 'April 2025',
    description: 'Step-by-step guidance for common home repairs. Covers plumbing, electrical basics, drywall, painting, and weatherproofing — with NH-specific safety notes.',
    aiPersona: 'FixItAI',
    aiContext: 'DIY home repair guide covering plumbing basics, electrical safety, drywall, painting, weatherproofing, and when to call a professional in New Hampshire',
    chapters: [
      {
        id: 'ch1', title: 'Safety First — Know Your Limits',
        content: [
          'DIY repair saves money and builds real knowledge of your home — but knowing when to stop and call a professional is the most important skill. In NH, unlicensed electrical work above minor repairs (like replacing a receptacle) violates RSA 319-C and can void your homeowner\'s insurance. Plumbing permits are required for new installations in most NH municipalities.',
          'Before any repair, shut off the relevant utility. Water main shut-off for plumbing, circuit breaker for electrical. Never assume a circuit is dead — test it with a non-contact voltage tester before touching any wire. Water and electricity are the two most common sources of serious DIY injury.',
          'Keep a well-stocked tool kit so you\'re never tempted to improvise with the wrong tool. The right tool for the job prevents damage, speeds the work, and keeps you safe.',
        ],
        checklist: [
          { item: 'Own a non-contact voltage tester — use it every time' },
          { item: 'Know location of water main shut-off before starting plumbing work' },
          { item: 'Never work on a live circuit', nhNote: 'NH RSA 319-C requires licensed electricians for service panel work and new circuits.' },
          { item: 'Wear safety glasses for any cutting, grinding, or drilling' },
        ],
        tip: 'YouTube is your best assistant — search the exact model number of any appliance before attempting repair. Manufacturer-specific disassembly techniques prevent breaking what you\'re trying to fix.',
      },
      {
        id: 'ch2', title: 'Plumbing Fundamentals',
        content: [
          'Most plumbing emergencies — dripping faucets, running toilets, slow drains — are well within DIY range. A dripping faucet wastes up to 3,000 gallons per year. In NH, where water and sewer rates vary by municipality, fixing leaks has a meaningful financial return.',
          'The most important plumbing skill is knowing how to shut off water to individual fixtures using the supply valves under sinks and behind toilets, and knowing where the main shut-off is. For toilets, the flapper is the most common failure — a $5 part that causes a running toilet. Replace it before adjusting the fill valve.',
          'For NH homeowners with well water, sediment filters and water softeners require regular maintenance. Neglected filters can reduce water pressure and introduce contaminants. Check and replace filter cartridges every 3–6 months depending on your water quality.',
        ],
        checklist: [
          { item: 'Replace toilet flapper if toilet runs intermittently' },
          { item: 'Clean aerators on all faucets annually' },
          { item: 'Check under-sink supply valves — they seize if never exercised' },
          { item: 'Replace water filter cartridges every 3–6 months', nhNote: 'NH well water often has elevated arsenic or radon — test annually through NH DHHS.' },
          { item: 'Insulate pipes in unheated spaces before November', nhNote: 'NH frost depth is 4–5 feet — pipes in crawl spaces are high-risk.' },
        ],
      },
      {
        id: 'ch3', title: 'Electrical Basics You Can Do Safely',
        content: [
          'Replacing outlets, switches, and light fixtures is legal and safe for homeowners in NH — no permit required for like-for-like replacements. Always turn off the circuit at the breaker and verify with a voltage tester before touching any wire.',
          'GFCI outlets are required in bathrooms, kitchens, garages, and outdoor locations. If any of these outlets aren\'t GFCI, replacing them is a safety improvement worth doing. One GFCI outlet can protect downstream regular outlets on the same circuit — learn to wire them correctly to avoid tripping entire circuits.',
          'Do not attempt to replace or upgrade your electrical panel, run new circuits, or install subpanels yourself. These require an NH licensed electrician and a permit. Unpermitted electrical work can cause house fires, void your insurance, and create legal liability when you sell.',
        ],
        checklist: [
          { item: 'Test all GFCI outlets monthly using test button' },
          { item: 'Replace non-GFCI outlets in bathrooms, kitchen, garage, outdoors' },
          { item: 'Label every circuit breaker accurately' },
          { item: 'Replace any two-prong outlets with grounded three-prong', nhNote: 'Requires a licensed electrician in NH to run new ground wire if no existing ground is present.' },
        ],
        tip: 'Take a photo of existing wire connections before disconnecting anything. This gives you a reference when reconnecting the new device.',
      },
      {
        id: 'ch4', title: 'Weatherproofing for NH Winters',
        content: [
          'Air sealing is the single highest-ROI improvement for NH homes. Up to 30% of heating energy is lost through gaps around windows, doors, electrical outlets, plumbing penetrations, and attic hatches. Foam sealant and weatherstripping are inexpensive and dramatically reduce heating bills.',
          'Ice dams form when heat escapes through the roof, melts snow, and the meltwater refreezes at the cold eaves. The long-term fix is more attic insulation and air sealing — not heated cables, which treat symptoms. NH Energy Code (RSA 155-D) recommends R-49 insulation for attic floors in climate zones 6 and 7 (most of NH).',
          'Storm windows and door sweeps add another layer of insulation with minimal cost. For older single-pane windows, interior window insulation film can reduce heat loss by up to 55% for under $20 per window.',
        ],
        checklist: [
          { item: 'Caulk all exterior penetrations with silicone sealant' },
          { item: 'Replace worn weatherstripping on all exterior doors' },
          { item: 'Add door sweeps to exterior doors' },
          { item: 'Insulate attic to R-49 minimum', nhNote: 'Eversource NH rebates up to $1,500 for qualifying attic insulation projects.' },
          { item: 'Air seal attic floor before adding insulation' },
          { item: 'Check pipe insulation in unheated crawl spaces and basement perimeter' },
        ],
        nhNote: 'Eversource NH offers rebates through the NH Saves program for insulation, air sealing, and HVAC upgrades. Visit nhsaves.com or call 1-888-570-1778.',
      },
    ],
  },
  // ── Landlord ───────────────────────────────────────────────────────────────
  {
    id: 'landlord-operations',
    title: 'Landlord Operations Manual',
    subtitle: 'Run your rental property like a business',
    audience: ['landlord'],
    icon: Building2, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20',
    difficulty: 'Intermediate', readTime: 35, version: '3.0', updated: 'May 2025',
    description: 'Complete operational playbook for NH landlords. Covers tenant screening, leases, RSA 540 compliance, maintenance obligations, and dispute resolution.',
    aiPersona: 'LandlordAI',
    aiContext: 'New Hampshire landlord operations covering RSA 540 compliance, tenant screening, lease terms, security deposits, habitability standards, and eviction process',
    chapters: [
      {
        id: 'ch1', title: 'NH Landlord-Tenant Law (RSA 540)',
        content: [
          'New Hampshire\'s landlord-tenant law (RSA 540 and RSA 540-A) governs nearly every aspect of the rental relationship. Understanding these statutes before you rent your first unit is not optional — violations can result in damages, attorney fees, and in serious cases, criminal liability.',
          'RSA 540-A prohibits landlord retaliation and self-help eviction. You cannot shut off utilities, remove doors or windows, or change locks to force a tenant out. Evictions must go through the court process — filing a landlord-tenant writ, serving notice, attending a hearing, and obtaining a writ of possession if successful.',
          'Security deposits are capped at one month\'s rent in NH. They must be held in a separate account and returned within 30 days of lease end, accompanied by an itemized statement of any deductions. Failure to comply can result in the landlord owing the tenant double the withheld amount.',
        ],
        checklist: [
          { item: 'Read RSA 540 and RSA 540-A in full before renting', nhNote: 'Available free at gencourt.state.nh.us' },
          { item: 'Open a separate security deposit account per RSA 540-A:6' },
          { item: 'Return deposit within 30 days of unit vacancy with itemized statement' },
          { item: 'Never shut off utilities or change locks as self-help eviction' },
          { item: 'Document all move-in conditions with photos and written checklist' },
        ],
        nhNote: 'NH Legal Assistance (nhla.org) provides free legal help for landlord-tenant disputes. NH does not have rent control — you may set rent at market rate.',
      },
      {
        id: 'ch2', title: 'Tenant Screening Best Practices',
        content: [
          'Tenant screening is your most important decision as a landlord. The cost of a bad tenant — missed rent, property damage, eviction costs — typically runs $5,000–$15,000 or more. A rigorous, consistently applied screening process protects your investment and must comply with the Federal Fair Housing Act and NH RSA 354-A.',
          'Screen every adult applicant consistently. Use a written application, pull a credit report and background check (with applicant consent), verify income at 2.5–3x monthly rent, and call previous landlords directly. Do not rely solely on the landlord listed on the application — find the actual owner through property records.',
          'NH RSA 354-A prohibits discrimination based on race, color, religion, national origin, sex, age, familial status, disability, and sexual orientation. Source of income is not a protected class in NH, meaning you may screen based on income type. Document your screening criteria and apply them consistently to every applicant.',
        ],
        checklist: [
          { item: 'Create a written, consistent screening criteria document' },
          { item: 'Run credit and background check on all adults 18+' },
          { item: 'Verify income at 2.5–3x monthly rent with pay stubs or bank statements' },
          { item: 'Call prior landlord (find actual owner — not just the reference provided)' },
          { item: 'Document reason for approval or denial in writing' },
        ],
      },
      {
        id: 'ch3', title: 'NH-Compliant Lease Agreements',
        content: [
          'Your lease is your primary legal protection. Use a written lease for all tenancies — month-to-month oral agreements create disputes and limit your enforcement options. A proper NH lease should cover: rent amount and due date, late fees (reasonable, not punitive), pet policy, smoking policy, maintenance responsibilities, access notice (24 hours minimum in NH under RSA 540-A:3), and lease term.',
          'Late fees must be reasonable. NH courts have held that excessive late fees are unenforceable. A flat fee of $25–$50 or 3–5% of monthly rent after a 5-day grace period is standard and defensible.',
          'Include a move-in checklist as an addendum to the lease, signed by both parties. This is your primary defense against security deposit disputes. Photograph every room, every fixture, every wall. Store everything in PropertyAI\'s Document Intelligence.',
        ],
        checklist: [
          { item: 'Use a written lease for every tenancy' },
          { item: 'Include 24-hour entry notice requirement (NH RSA 540-A:3)' },
          { item: 'Attach signed move-in checklist with photos' },
          { item: 'Specify late fee structure — keep it reasonable' },
          { item: 'Include maintenance request procedure in lease' },
          { item: 'Have attorney review template lease before first use', nhNote: 'NH Bar Association Lawyer Referral Service: 603-229-0002' },
        ],
      },
      {
        id: 'ch4', title: 'Maintaining Habitability Standards',
        content: [
          'NH law requires landlords to maintain rental units in a habitable condition. This includes functional heating (capable of maintaining 65°F in all living areas from September to June), hot and cold running water, working plumbing and electrical systems, structurally sound walls, floors, and ceilings, and freedom from vermin infestations.',
          'Respond to maintenance requests in writing and document your response time. NH courts have held that habitability failures — particularly heating failures in winter — can entitle tenants to rent abatement and other remedies. A pattern of slow responses to written requests creates legal risk.',
          'Use PropertyAI\'s maintenance tracking to log every work request, vendor dispatched, and resolution date. This documentation is your primary defense in habitability disputes.',
        ],
        checklist: [
          { item: 'Ensure heating system can maintain 65°F Sept–June' },
          { item: 'Respond to maintenance requests in writing within 24 hours' },
          { item: 'Document all repairs with vendor invoice and photos' },
          { item: 'Inspect units annually — document findings with photos' },
          { item: 'Have pest control contract for multi-unit properties' },
        ],
        nhNote: 'NH RSA 540-B governs shared facilities housing — different rules apply if you share common areas with tenants.',
      },
    ],
  },
  // ── Condo/HOA ──────────────────────────────────────────────────────────────
  {
    id: 'condo-board-handbook',
    title: 'Condo Board Handbook',
    subtitle: 'Govern your association with confidence',
    audience: ['condo_hoa'],
    icon: Shield, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20',
    difficulty: 'Intermediate', readTime: 30, version: '2.4', updated: 'June 2025',
    description: 'Complete handbook for NH condo association boards. Covers RSA 356-B compliance, meeting procedures, budget governance, reserve funds, and vendor management.',
    aiPersona: 'BoardAI',
    aiContext: 'New Hampshire condo association governance under RSA 356-B, including board duties, meeting procedures, reserve funds, assessments, and vendor management',
    chapters: [
      {
        id: 'ch1', title: 'NH Condo Law — RSA 356-B Overview',
        content: [
          'New Hampshire\'s Condominium Act (RSA 356-B) governs the creation, operation, and governance of condominium associations in the state. Every board member should be familiar with the key provisions that affect their day-to-day decisions.',
          'The Act establishes the hierarchy of governing documents: RSA 356-B → Declaration → Bylaws → Rules and Regulations. A rule that conflicts with a higher document is unenforceable. When in doubt, the statute prevails over association documents.',
          'Boards have a fiduciary duty to act in the best interest of all unit owners. This means decisions must be made in good faith, with adequate information, and without self-dealing. Board members can be held personally liable for decisions that violate this duty — errors and omissions insurance for board members is strongly recommended.',
        ],
        checklist: [
          { item: 'Read RSA 356-B in full — available at gencourt.state.nh.us' },
          { item: 'Review Declaration and Bylaws for any conflicts with RSA 356-B' },
          { item: 'Obtain Directors & Officers (D&O) insurance for board members' },
          { item: 'Establish a conflict of interest policy in writing' },
          { item: 'Keep meeting minutes for all board and owner meetings' },
        ],
        nhNote: 'NH requires condo declarations to be recorded with the county registry of deeds. All amendments must also be recorded.',
      },
      {
        id: 'ch2', title: 'Budget Governance and Reserve Funds',
        content: [
          'The association budget is your primary financial planning document. NH best practices call for a budget that covers operating expenses (insurance, utilities, landscaping, management fees, maintenance contracts) plus an annual contribution to the reserve fund. Boards that defer reserve contributions consistently face special assessment crises.',
          'A reserve study is an engineering analysis of your association\'s common elements — their current condition, remaining life, and replacement cost. NH does not currently mandate reserve studies by statute for all associations, but they are considered best practice and are required by most lenders financing unit purchases in your community.',
          'The reserve fund should be "fully funded" — meaning it holds the pro-rated portion of every anticipated capital expense. Many NH associations are underfunded, which is a disclosed material fact that depresses unit sale prices. PropertyAI\'s Capital Planning module can model your funding trajectory.',
        ],
        checklist: [
          { item: 'Commission a reserve study every 3–5 years', nhNote: 'NH CAI chapter maintains a list of qualified reserve study firms.' },
          { item: 'Contribute to reserves monthly — not just when capital needs arise' },
          { item: 'Disclose reserve fund status to prospective buyers per RSA 356-B:58' },
          { item: 'Keep reserve funds in a separate, FDIC-insured account' },
          { item: 'Review reserve study annually and adjust contributions' },
        ],
      },
      {
        id: 'ch3', title: 'Running Effective Board Meetings',
        content: [
          'Board meetings are where governance happens. NH RSA 356-B:37 requires that owners receive reasonable notice of meetings and be permitted to attend. Some associations restrict owner participation to designated comment periods — your bylaws govern the specifics.',
          'Every board meeting should have an agenda distributed in advance, minutes recorded and approved at the next meeting, and action items tracked to completion. Decisions without adequate documentation create disputes — a board member\'s memory of what was decided is not sufficient.',
          'Executive sessions (closed meetings) are permitted for specific topics: personnel matters, ongoing litigation, and contract negotiations. All other business must be conducted in open session. Passing a motion to move into executive session requires a board vote.',
        ],
        checklist: [
          { item: 'Distribute agenda 7 days before board meetings' },
          { item: 'Record minutes for every meeting and store in PropertyAI Documents' },
          { item: 'Post approved minutes where all owners can access them' },
          { item: 'Hold annual owner meeting per RSA 356-B:36' },
          { item: 'Track all action items with assigned owners and deadlines' },
        ],
      },
      {
        id: 'ch4', title: 'Vendor Management and Contracts',
        content: [
          'Your association likely spends the majority of its operating budget on vendors — landscaping, snow removal, cleaning, management, and maintenance. Professional vendor management protects the association and ensures you get the value you\'re paying for.',
          'All contracts should be reviewed by an attorney before signing. Pay particular attention to: auto-renewal clauses (common in NH vendor contracts and easy to miss), termination provisions, liability and insurance requirements, and payment terms. NH does not cap contract lengths for associations — a multi-year contract with a bad vendor is an expensive problem.',
          'Require certificates of insurance from every vendor and list the association as an additional insured. Verify coverage annually — a vendor whose insurance lapses mid-contract leaves the association exposed for any injury or damage they cause on your property.',
        ],
        checklist: [
          { item: 'Collect certificate of insurance from every vendor annually' },
          { item: 'Add association as additional insured on all vendor policies' },
          { item: 'Have attorney review any contract over $5,000' },
          { item: 'Track all contract renewal dates to avoid auto-renewal traps' },
          { item: 'Bid major contracts (landscaping, snow removal) every 2–3 years' },
        ],
        nhNote: 'NH has no statutory cap on vendor contract terms for associations. Multi-year contracts should include a termination-for-cause provision.',
      },
    ],
  },
  // ── Reserve Planning ───────────────────────────────────────────────────────
  {
    id: 'reserve-planning-guide',
    title: 'Reserve Planning Guide',
    subtitle: 'Fund your association\'s future without special assessments',
    audience: ['condo_hoa'],
    icon: BarChart3, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20',
    difficulty: 'Advanced', readTime: 25, version: '1.5', updated: 'May 2025',
    description: 'A technical guide to NH condo reserve fund management. Covers reserve study interpretation, funding models, investment options, and special assessment avoidance.',
    aiPersona: 'ReserveAI',
    aiContext: 'condo association reserve fund planning including reserve studies, funding models (straight-line, percent funded, threshold), investment options for NH associations, and special assessment avoidance',
    chapters: [
      {
        id: 'ch1', title: 'What Is a Reserve Study?',
        content: [
          'A reserve study is a financial planning tool that inventories your association\'s common elements, estimates their remaining useful life and replacement cost, and calculates how much the association should be saving annually to fund those replacements.',
          'A Level 1 reserve study (full study) includes a site inspection and financial analysis. It is the gold standard and should be done every 3–5 years. A Level 3 update (no site visit) is appropriate for interim years. Reserve study firms certified by the Community Associations Institute (CAI) follow national standards that NH lenders recognize.',
          'The study will give you a "percent funded" score — the ratio of what you currently have to what you should have. Fully funded means 100%. Below 70% is considered underfunded by most lenders and will be disclosed to buyers, potentially affecting sale prices.',
        ],
        tip: 'Request both a "straight-line" and "percent funded" model from your reserve analyst. Each gives a different contribution rate — understanding the trade-offs helps your board make an informed budget decision.',
      },
      {
        id: 'ch2', title: 'Funding Models Explained',
        content: [
          'The straight-line (or "cash flow") model funds each component individually — you save specifically for the roof, parking lot, and pool pump on separate schedules. It minimizes current contributions but creates spikes in future years when multiple components need replacement simultaneously.',
          'The percent funded model aims to reach and maintain 100% funding across all components simultaneously. It requires higher current contributions but produces stable, predictable annual budgets. Most professional property managers recommend this model for NH associations of over 30 units.',
          'The threshold model is a hybrid — it maintains a minimum cash reserve (e.g., 10–15% of annual budget) while funding individual components separately. It is easier to sell to owners resistant to higher dues but may still leave the association vulnerable to simultaneous large expenditures.',
        ],
        checklist: [
          { item: 'Choose funding model based on association size and owner tolerance' },
          { item: 'Build reserve contribution into annual budget before any other increases' },
          { item: 'Review and adjust contribution rate every time you receive a new study' },
          { item: 'Model 3 scenarios in PropertyAI Capital Planning: low/mid/high contribution' },
        ],
      },
      {
        id: 'ch3', title: 'Investing Association Reserves',
        content: [
          'Reserve funds are not operating funds — they should be invested conservatively, with liquidity matched to anticipated expenditures. NH law does not mandate specific investment vehicles for association reserves, but board fiduciary duty limits appropriate options.',
          'FDIC-insured accounts — money market, CDs, and high-yield savings — are the standard. A laddered CD strategy (staggering maturity dates to match projected expenditures) is a practical approach that balances yield with liquidity. Avoid equities for reserve funds — market volatility is incompatible with near-term capital expenditure planning.',
          'Some NH banks offer association-specific account structures with higher FDIC coverage through program banks. Discuss options with your banker and ensure all board members are signatories — single-signer accounts on association funds create fraud risk.',
        ],
        checklist: [
          { item: 'Keep reserve funds in FDIC-insured accounts only' },
          { item: 'Require two signatories for reserve account withdrawals' },
          { item: 'Ladder CDs to match capital expenditure schedule' },
          { item: 'Never co-mingle operating and reserve funds' },
          { item: 'Review investment rates annually — shop for better yields' },
        ],
        nhNote: 'NH credit unions (like Triangle Credit Union and Service Credit Union) often offer competitive CD rates and understand association account structures.',
      },
    ],
  },
  // ── Contractor ─────────────────────────────────────────────────────────────
  {
    id: 'recurring-revenue-strategies',
    title: 'Recurring Revenue Strategies',
    subtitle: 'Build predictable income from your service business',
    audience: ['contractor'],
    icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20',
    difficulty: 'Intermediate', readTime: 20, version: '1.2', updated: 'April 2025',
    description: 'A business development guide for NH contractors and maintenance companies. Covers maintenance contracts, subscription services, and how to sell recurring value.',
    aiPersona: 'ContractorAI',
    aiContext: 'contractor recurring revenue strategies including maintenance contracts, subscription service models, pricing, customer retention, and selling maintenance programs to NH property owners and condo associations',
    chapters: [
      {
        id: 'ch1', title: 'Why Recurring Revenue Changes Everything',
        content: [
          'The traditional trade contractor model — find the job, bid the job, do the job, find the next job — creates feast-or-famine revenue cycles and leaves you perpetually dependent on new customer acquisition. Recurring maintenance contracts flip this model: you know your revenue in January for the rest of the year.',
          'A maintenance subscription program converts one-time customers into annual clients. An HVAC contractor who does 200 tune-ups per year at $150 each generates $30,000 in annual subscription revenue before a single emergency call or equipment replacement. That predictable base lets you staff intelligently and quote growth projects from a position of confidence.',
          'NH property owners — particularly landlords, property managers, and condo associations — actively prefer contractors who offer documented service agreements. It reduces their administrative burden, ensures RSA 540 compliance documentation, and transfers some risk management to your business.',
        ],
        tip: 'Start with just one service tier for maintenance contracts. Offer it to your 20 best customers and refine the model before scaling. Complexity is the enemy of execution in the early stages.',
      },
      {
        id: 'ch2', title: 'Designing Your Maintenance Program',
        content: [
          'A strong maintenance program has three components: scheduled visits (the core deliverable), priority service (the differentiated benefit), and documentation (the proof of value). Customers pay for all three — not just the visits.',
          'Structure tiers based on visit frequency and response time. A Bronze tier might include one annual visit and 48-hour priority response. Silver adds two visits and 24-hour response. Gold adds quarterly visits, same-day response, and discounted parts. Price at a margin that accounts for the higher frequency of contact and lower acquisition cost per revenue dollar.',
          'In NH, leverage your maintenance contracts to build property histories in PropertyAI. Offer to document all service visits directly in the customer\'s account. This differentiates you from competitors, reduces paperwork on your end, and creates switching costs — a customer who has two years of documented service history with you is less likely to move to a new contractor.',
        ],
        checklist: [
          { item: 'Define 2–3 maintenance tiers with clear deliverables and prices' },
          { item: 'Build a service report template — deliver after every visit' },
          { item: 'Auto-renew contracts annually with 30-day cancellation notice' },
          { item: 'Collect payment annually upfront or monthly via ACH' },
          { item: 'Track contract renewal rates as your primary business metric' },
        ],
      },
      {
        id: 'ch3', title: 'Selling to Condo Associations',
        content: [
          'NH condo associations (RSA 356-B) are among the best recurring revenue customers for contractors. They have stable, multi-year budgets, multiple systems requiring service, and board members who value documented compliance — exactly what a well-run maintenance program delivers.',
          'To win association contracts, present at a board meeting with a written proposal. Include your license number (NH requires licensing for plumbing, electrical, and HVAC work), certificate of insurance, references from other NH associations, and a sample service report. Associations want professionalism and documentation — lead with those.',
          'Price association contracts on a per-unit or per-system basis, not a flat fee. This makes your pricing transparent, easy to budget, and scalable as the association grows. A 50-unit association paying $30/unit/year for HVAC filter replacement and inspection is $1,500 in recurring annual revenue for a few hours of work.',
        ],
        checklist: [
          { item: 'Obtain all required NH trade licenses for your services', nhNote: 'NH requires licensing for plumbers (RSA 329-A), electricians (RSA 319-C), and HVAC contractors (RSA 153). Verify at nh.gov.' },
          { item: 'Carry $1M+ general liability and workers comp' },
          { item: 'Build a written association-specific proposal template' },
          { item: 'Ask for board meeting time — do not just drop off proposals' },
          { item: 'Offer a 90-day trial at reduced rate to get first association contract' },
        ],
        nhNote: 'NH HVAC contractors installing heat pumps should register for Eversource NH\'s authorized contractor program — it allows you to process rebates directly on behalf of customers.',
      },
    ],
  },
  // ── Capital Planning ───────────────────────────────────────────────────────
  {
    id: 'capital-planning-guide',
    title: 'Capital Planning Guide',
    subtitle: 'Forecast, fund, and execute large property investments',
    audience: ['commercial', 'condo_hoa', 'landlord'],
    icon: Target, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20',
    difficulty: 'Advanced', readTime: 18, version: '1.0', updated: 'June 2025',
    description: 'A strategic guide to capital planning for multi-family, commercial, and HOA properties. Covers 10-year forecasting, funding options, project sequencing, and ROI evaluation.',
    aiPersona: 'CapitalAI',
    aiContext: 'capital expenditure planning for multi-family, commercial, and condo properties including 10-year forecasting, reserve fund adequacy, project sequencing, financing options, and ROI evaluation',
    chapters: [
      {
        id: 'ch1', title: 'Building Your 10-Year Capital Plan',
        content: [
          'A capital plan is a forecast of major expenditures over a defined period — typically 10 years — based on the current condition and expected lifespan of your property\'s major systems. Unlike an operating budget, which covers routine expenses, a capital plan addresses non-recurring, high-cost items: roofs, HVAC systems, elevators, parking lots, and structural repairs.',
          'Start by inventorying every major system with its installation date and expected lifespan. PropertyAI\'s Capital Planning module does this automatically based on your Building Systems profile. The output is a year-by-year forecast of anticipated replacement costs.',
          'Build three scenarios: conservative (replace at end of expected lifespan), moderate (extend 20% with preventive maintenance), and deferred (extend 40% with active maintenance and condition monitoring). The moderate scenario is usually the most realistic and defensible.',
        ],
        tip: 'The most common capital planning mistake is treating cost estimates as fixed. Build in a 15–20% contingency on every line item — construction costs in NH have risen 30%+ since 2020.',
      },
      {
        id: 'ch2', title: 'Financing Large Capital Projects',
        content: [
          'When reserve funds are insufficient — which is common for associations that deferred contributions — financing the project is often the most practical path. NH associations can finance capital improvements through bank loans, special assessments, or a combination.',
          'Association loans are available through banks that specialize in community association lending. Terms typically run 5–15 years with rates tied to prime. The loan is secured by the association\'s assessment income — individual units are not encumbered. Approval requires board vote and usually owner notification per your bylaws.',
          'Special assessments are one-time fees charged to all unit owners for a specific project. They require board approval and, depending on your bylaws, may require owner vote. NH RSA 356-B:49 governs emergency assessments. Give owners maximum possible notice and a payment plan option — lump-sum special assessments generate the most resistance and board turnover.',
        ],
        checklist: [
          { item: 'Compare loan cost vs. special assessment for projects over $100K' },
          { item: 'Get 3 bids for any capital project over $25,000' },
          { item: 'Check NH CDFA for low-interest energy project financing', nhNote: 'NH Community Development Finance Authority offers below-market financing for qualifying energy improvements.' },
          { item: 'Notify owners 60 days before special assessment billing' },
          { item: 'Offer payment plan option to reduce owner hardship and board friction' },
        ],
      },
    ],
  },
];

// ─── AI Companion engine ───────────────────────────────────────────────────────

const AI_RESPONSES: { keywords: string[]; response: (guide: Guide) => string }[] = [
  {
    keywords: ['hello', 'hi', 'hey', 'start', 'help'],
    response: (g) => `Hi! I'm ${g.aiPersona}, your AI guide for "${g.title}." I can answer questions about any topic covered in this guide, help you create action checklists, summarize chapters, or explain concepts in more detail. What would you like to know?`,
  },
  {
    keywords: ['summary', 'summarize', 'overview', 'what is this about'],
    response: (g) => `Here's a summary of "${g.title}":\n\n${g.description}\n\nThe guide covers ${g.chapters.length} chapters:\n${g.chapters.map((c, i) => `${i + 1}. ${c.title}`).join('\n')}\n\nEstimated read time: ${g.readTime} minutes. Difficulty: ${g.difficulty}. What chapter would you like to start with?`,
  },
  {
    keywords: ['checklist', 'action', 'action plan', 'steps', 'what do i do', 'to do', 'todo'],
    response: (g) => {
      const allItems = g.chapters.flatMap(c => c.checklist || []);
      if (allItems.length === 0) return `This guide focuses more on concepts than checklists. Try asking me to explain a specific topic from the guide and I can give you a personalized action plan.`;
      const top5 = allItems.slice(0, 5);
      return `Here are your top action items from this guide:\n\n${top5.map((item, i) => `${i + 1}. ${item.item}${item.nhNote ? `\n   → NH Note: ${item.nhNote}` : ''}`).join('\n\n')}\n\nWant the full checklist or action items for a specific chapter?`;
    },
  },
  {
    keywords: ['nh', 'new hampshire', 'rsa', 'law', 'legal', 'regulation', 'statute', 'comply', 'compliance'],
    response: (g) => {
      const nhItems = g.chapters.flatMap(c => [
        ...(c.checklist?.filter(i => i.nhNote).map(i => `• ${i.nhNote}`) || []),
        ...(c.nhNote ? [`• ${c.nhNote}`] : []),
      ]);
      if (nhItems.length === 0) return `This guide doesn't contain specific NH legal citations, but the principles apply broadly to NH property owners. For NH-specific legal questions, I'd recommend consulting with the NH Bar Association's Lawyer Referral Service at 603-229-0002.`;
      return `Here are the key NH-specific notes from this guide:\n\n${nhItems.slice(0, 5).join('\n\n')}\n\nAlways consult a licensed NH attorney for legal advice specific to your situation.`;
    },
  },
  {
    keywords: ['cost', 'price', 'budget', 'money', 'expense', 'afford', 'how much'],
    response: (g) => `Great question on costs. The guide touches on financial considerations throughout. Key principles: build a dedicated reserve/maintenance fund, track every expense for tax basis purposes, and get 3 competitive bids for any project over $5,000. Want me to generate a personalized budget checklist based on your property type?`,
  },
  {
    keywords: ['maintenance', 'service', 'repair', 'schedule', 'when', 'annual', 'seasonal'],
    response: (g) => `Maintenance timing is critical in NH's climate. The key seasonal priorities:\n\n🍂 Fall (Oct): Service heating system, drain outdoor pipes, check weatherstripping\n❄️ Winter: Keep heat ≥55°F if away, monitor for ice dams, check carbon monoxide detectors\n🌱 Spring: Inspect foundation, clean gutters, service AC\n☀️ Summer: HVAC filter check, inspect roof from ground, tend outdoor drainage\n\nWant a personalized maintenance schedule for your specific property?`,
  },
  {
    keywords: ['eversource', 'rebate', 'incentive', 'energy', 'solar', 'ev', 'efficiency', 'nhsaves'],
    response: () => `NH has strong energy efficiency incentives:\n\n• **Eversource NH Saves**: Rebates for insulation, HVAC, water heaters, and more. Visit nhsaves.com or call 1-888-570-1778\n• **EV Charger Rebates**: Up to $500/port for Level 2 chargers through Eversource\n• **Solar**: NH net metering (RSA 362-A:9) credits excess solar production. NH CDFA offers low-interest solar loans\n• **Federal Credits**: 30% Investment Tax Credit for solar, heat pumps, insulation through 2032\n\nPropertyAI's Revenue AI tab can identify which incentives match your specific property.`,
  },
  {
    keywords: ['tenant', 'renter', 'lease', 'evict', 'screening', 'deposit'],
    response: () => `Key NH landlord-tenant rules:\n\n• **Security deposit**: Capped at 1 month's rent, returned within 30 days of vacancy with itemized statement\n• **Entry notice**: 24 hours minimum (RSA 540-A:3) except emergencies\n• **Eviction**: Must use court process — no self-help allowed (RSA 540-A)\n• **Habitability**: Must maintain 65°F heating Sept–June per RSA 540\n• **Screening**: Apply criteria consistently to all applicants per RSA 354-A (Fair Housing)\n\nNH Legal Assistance (nhla.org) provides free resources for landlord-tenant questions.`,
  },
  {
    keywords: ['reserve', 'fund', 'association', 'hoa', 'condo', 'board', 'assessment'],
    response: () => `Reserve fund best practices for NH associations:\n\n• Commission a reserve study every 3–5 years from a CAI-certified firm\n• Aim for 70–100% funded — below 70% is disclosed to buyers and affects unit values\n• Keep reserves in FDIC-insured accounts separate from operating funds\n• Require two signatories for all reserve withdrawals\n• NH RSA 356-B:58 requires disclosure of reserve fund status to prospective buyers\n\nPropertyAI's Capital Planning tab can model your funding trajectory and show what annual contribution rate achieves full funding.`,
  },
];

function getAIResponse(query: string, guide: Guide): string {
  const q = query.toLowerCase();
  for (const r of AI_RESPONSES) {
    if (r.keywords.some(kw => q.includes(kw))) return r.response(guide);
  }
  // Topic-specific fallback
  for (const chapter of guide.chapters) {
    if (q.includes(chapter.title.toLowerCase()) || chapter.title.toLowerCase().split(' ').some(w => w.length > 4 && q.includes(w))) {
      return `"${chapter.title}" covers: ${chapter.content[0].slice(0, 200)}…\n\nKey takeaways from this chapter:\n${(chapter.checklist || []).slice(0, 3).map(i => `• ${i.item}`).join('\n') || 'No specific checklist items — this is a conceptual chapter. Ask me to explain any specific concept in more detail.'}\n\n${chapter.tip ? `💡 Tip: ${chapter.tip}` : ''}`;
    }
  }
  return `That's a great question about "${guide.title}." While I don't have a specific answer for "${query}" in this guide, here's what I can help with:\n\n${guide.chapters.map(c => `• Ask me about "${c.title}"`).join('\n')}\n\nOr try asking for a summary, checklist, NH legal notes, or maintenance schedule.`;
}

// ─── Audience config ──────────────────────────────────────────────────────────

const AUDIENCE_CONFIG: Record<Audience, { label: string; color: string }> = {
  homeowner:   { label: 'Homeowner', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  diy:         { label: 'DIY', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  landlord:    { label: 'Landlord', color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' },
  commercial:  { label: 'Commercial', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
  condo_hoa:   { label: 'Condo/HOA', color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' },
  contractor:  { label: 'Contractor', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
};

const DIFF_COLOR: Record<Difficulty, string> = {
  Beginner: 'text-green-400 bg-green-500/10 border-green-500/30',
  Intermediate: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  Advanced: 'text-red-400 bg-red-500/10 border-red-500/30',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PropertyKnowledgeCenter() {
  const [search, setSearch] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<Audience | 'all'>('all');
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [activeChapter, setActiveChapter] = useState<string>('');
  const [completedChapters, setCompletedChapters] = useState<Record<string, Set<string>>>({});
  const [showAI, setShowAI] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    try { const b = localStorage.getItem('bp_kc_bookmarks'); return b ? new Set(JSON.parse(b)) : new Set(); } catch { return new Set(); }
  });
  const [expandedChecklist, setExpandedChecklist] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const filteredGuides = useMemo(() => {
    let list = GUIDES;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(g => g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q) || g.chapters.some(c => c.title.toLowerCase().includes(q)));
    }
    if (audienceFilter !== 'all') list = list.filter(g => g.audience.includes(audienceFilter));
    return list;
  }, [search, audienceFilter]);

  function openGuide(guide: Guide) {
    setSelectedGuide(guide);
    setActiveChapter(guide.chapters[0].id);
    setShowAI(false);
    setMessages([{
      id: 'm0', role: 'ai',
      text: `Hi! I'm ${guide.aiPersona}, your AI companion for "${guide.title}." Ask me anything about the content, request a summary, generate a checklist, or get NH-specific guidance. How can I help?`,
      ts: new Date().toISOString(),
    }]);
  }

  function toggleBookmark(guideId: string) {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(guideId)) next.delete(guideId); else next.add(guideId);
      try { localStorage.setItem('bp_kc_bookmarks', JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  function markChapterDone(guideId: string, chapterId: string) {
    setCompletedChapters(prev => {
      const guideSet = new Set(prev[guideId] || []);
      guideSet.add(chapterId);
      const next = { ...prev, [guideId]: guideSet };
      return next;
    });
    const chapters = selectedGuide?.chapters || [];
    const idx = chapters.findIndex(c => c.id === chapterId);
    if (idx < chapters.length - 1) {
      setActiveChapter(chapters[idx + 1].id);
      toast.success('Chapter complete! Moving to next.');
    } else {
      toast.success('🎉 Guide complete! Well done.');
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || !selectedGuide) return;
    setInput('');
    const userMsg: ChatMessage = { id: `m${Date.now()}`, role: 'user', text, ts: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setAiTyping(true);
    await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
    const response = getAIResponse(text, selectedGuide);
    const aiMsg: ChatMessage = { id: `m${Date.now()}a`, role: 'ai', text: response, ts: new Date().toISOString() };
    setMessages(prev => [...prev, aiMsg]);
    setAiTyping(false);
  }

  const currentChapter = selectedGuide?.chapters.find(c => c.id === activeChapter);
  const completedSet = selectedGuide ? (completedChapters[selectedGuide.id] || new Set()) : new Set();
  const progress = selectedGuide ? Math.round((completedSet.size / selectedGuide.chapters.length) * 100) : 0;

  // ─── Library view ──────────────────────────────────────────────────────────
  if (!selectedGuide) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-violet-400" /> Digital Library
            </h3>
            <p className="text-xs text-gray-500 mt-1">{GUIDES.length} professional guides — each with an AI learning companion</p>
          </div>
          <div className="flex items-center gap-2">
            {bookmarks.size > 0 && (
              <button onClick={() => setAudienceFilter('all')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white text-xs font-medium transition">
                <Bookmark className="w-3.5 h-3.5 text-amber-400" /> {bookmarks.size} saved
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guides, topics, chapters…"
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] focus:border-violet-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none transition" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {([['all', 'All'], ['homeowner', 'Homeowner'], ['diy', 'DIY'], ['landlord', 'Landlord'], ['condo_hoa', 'Condo/HOA'], ['contractor', 'Contractor'], ['commercial', 'Commercial']] as [Audience | 'all', string][]).map(([val, label]) => (
              <button key={val} onClick={() => setAudienceFilter(val)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition border ${audienceFilter === val ? 'bg-violet-600 text-white border-violet-600' : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Guide grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGuides.map(guide => {
            const Icon = guide.icon;
            const done = completedChapters[guide.id]?.size || 0;
            const pct = Math.round((done / guide.chapters.length) * 100);
            const isBookmarked = bookmarks.has(guide.id);
            return (
              <div key={guide.id} className={`bg-[#111] border rounded-2xl overflow-hidden hover:border-violet-500/30 transition group flex flex-col ${guide.bg}`}>
                {/* Card header */}
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${guide.bg}`}>
                      <Icon className={`w-5.5 h-5.5 ${guide.color}`} style={{ width: 22, height: 22 }} />
                    </div>
                    <button onClick={e => { e.stopPropagation(); toggleBookmark(guide.id); }}
                      className={`p-1.5 rounded-lg transition ${isBookmarked ? 'text-amber-400' : 'text-gray-600 hover:text-gray-400'}`}>
                      <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
                    </button>
                  </div>

                  <h3 className="font-bold text-white text-sm leading-snug mb-1">{guide.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-3">{guide.subtitle}</p>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {guide.audience.map(a => (
                      <span key={a} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${AUDIENCE_CONFIG[a].color}`}>
                        {AUDIENCE_CONFIG[a].label}
                      </span>
                    ))}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${DIFF_COLOR[guide.difficulty]}`}>
                      {guide.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {guide.readTime} min</span>
                    <span className="flex items-center gap-1"><List className="w-3 h-3" /> {guide.chapters.length} chapters</span>
                    <span className="flex items-center gap-1"><Bot className="w-3 h-3 text-violet-400" /> AI companion</span>
                  </div>
                </div>

                {/* Progress bar */}
                {pct > 0 && (
                  <div className="px-5 pb-2">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                      <span>Progress</span><span className="text-violet-400 font-bold">{pct}%</span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-[#2A2A2A]">
                      <div className="h-1 rounded-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="px-5 pb-5 pt-3">
                  <button onClick={() => openGuide(guide)}
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition flex items-center justify-center gap-2">
                    {pct > 0 ? <><RefreshCw className="w-3.5 h-3.5" /> Continue Reading</> : <><BookOpen className="w-3.5 h-3.5" /> Open Guide</>}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredGuides.length === 0 && (
          <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-10 text-center">
            <Search className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No guides match your search</p>
          </div>
        )}
      </div>
    );
  }

  // ─── Reader view ───────────────────────────────────────────────────────────
  const GuideIcon = selectedGuide.icon;
  return (
    <div className="flex gap-0 -mx-4 sm:-mx-6 relative" style={{ minHeight: '70vh' }}>

      {/* Chapter sidebar */}
      <div className="w-56 flex-shrink-0 bg-[#0d0d0d] border-r border-[#1f1f1f] px-3 py-5 space-y-1 hidden lg:block" style={{ minHeight: '100%' }}>
        <button onClick={() => setSelectedGuide(null)}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition mb-4 w-full">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Library
        </button>

        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${selectedGuide.bg} mb-4`}>
          <GuideIcon className={`w-4 h-4 ${selectedGuide.color} flex-shrink-0`} />
          <span className="text-xs font-bold text-white leading-tight">{selectedGuide.title}</span>
        </div>

        <div className="space-y-0.5">
          {selectedGuide.chapters.map((ch, i) => {
            const done = completedSet.has(ch.id);
            return (
              <button key={ch.id} onClick={() => setActiveChapter(ch.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition text-left ${activeChapter === ch.id ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]'}`}>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 text-[10px] font-black ${done ? 'bg-green-500 border-green-500 text-white' : activeChapter === ch.id ? 'border-white/40 text-white/60' : 'border-[#3A3A3A] text-gray-600'}`}>
                  {done ? <CheckCircle className="w-3 h-3" /> : i + 1}
                </div>
                <span className="line-clamp-2 leading-tight">{ch.title}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-4 px-3 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <span>Progress</span><span className="text-violet-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#2A2A2A]">
            <div className="h-1.5 rounded-full bg-violet-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 px-4 sm:px-8 py-6 overflow-y-auto" style={{ maxHeight: '82vh' }}>
        {/* Reader header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <button onClick={() => setSelectedGuide(null)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition lg:hidden">
            <ChevronLeft className="w-3.5 h-3.5" /> Library
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500">v{selectedGuide.version} · Updated {selectedGuide.updated}</span>
            <button onClick={() => toggleBookmark(selectedGuide.id)}
              className={`p-2 rounded-lg transition ${bookmarks.has(selectedGuide.id) ? 'text-amber-400' : 'text-gray-500 hover:text-white'} hover:bg-[#1A1A1A]`}>
              <Bookmark className={`w-4 h-4 ${bookmarks.has(selectedGuide.id) ? 'fill-amber-400' : ''}`} />
            </button>
            <button onClick={() => { setShowAI(true); setTimeout(() => inputRef.current?.focus(), 100); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition border ${showAI ? 'bg-violet-600 text-white border-violet-600' : 'bg-[#1A1A1A] border-[#2A2A2A] text-violet-400 hover:bg-violet-600/10'}`}>
              <Bot className="w-3.5 h-3.5" /> {selectedGuide.aiPersona}
            </button>
          </div>
        </div>

        {/* Mobile chapter nav */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 lg:hidden">
          {selectedGuide.chapters.map((ch, i) => (
            <button key={ch.id} onClick={() => setActiveChapter(ch.id)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition ${activeChapter === ch.id ? 'bg-violet-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400'}`}>
              {i + 1}. {ch.title}
            </button>
          ))}
        </div>

        {/* Chapter content */}
        {currentChapter && (
          <AnimatePresence mode="wait">
            <motion.div key={currentChapter.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
              className="space-y-6 max-w-2xl">

              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-2">
                  Chapter {selectedGuide.chapters.findIndex(c => c.id === currentChapter.id) + 1} of {selectedGuide.chapters.length}
                </p>
                <h2 className="text-2xl font-black text-white leading-tight">{currentChapter.title}</h2>
              </div>

              {/* Paragraphs */}
              <div className="space-y-4">
                {currentChapter.content.map((para, i) => (
                  <p key={i} className="text-gray-300 text-sm leading-relaxed">{para}</p>
                ))}
              </div>

              {/* NH Note */}
              {currentChapter.nhNote && (
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 flex items-start gap-3">
                  <Shield className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-300 leading-relaxed"><span className="font-bold text-violet-400">NH Note: </span>{currentChapter.nhNote}</p>
                </div>
              )}

              {/* Tip */}
              {currentChapter.tip && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                  <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-300 leading-relaxed"><span className="font-bold text-amber-400">Pro Tip: </span>{currentChapter.tip}</p>
                </div>
              )}

              {/* Checklist */}
              {currentChapter.checklist && currentChapter.checklist.length > 0 && (
                <div className="bg-[#111] border border-[#2A2A2A] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedChecklist(expandedChecklist === currentChapter.id ? null : currentChapter.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1A1A1A] transition">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-semibold text-white">Chapter Checklist</span>
                      <span className="text-xs text-gray-500">({currentChapter.checklist.length} items)</span>
                    </div>
                    {expandedChecklist === currentChapter.id
                      ? <ChevronUp className="w-4 h-4 text-gray-500" />
                      : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>
                  <AnimatePresence>
                    {expandedChecklist === currentChapter.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-5 pb-4 space-y-3 border-t border-[#2A2A2A] pt-4">
                          {currentChapter.checklist.map((item, i) => (
                            <div key={i} className="space-y-1">
                              <div className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-md border border-[#3A3A3A] flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-gray-300">{item.item}</p>
                              </div>
                              {item.nhNote && (
                                <p className="text-xs text-violet-400 ml-8 flex items-start gap-1.5">
                                  <Shield className="w-3 h-3 flex-shrink-0 mt-0.5" /> {item.nhNote}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-[#2A2A2A]">
                <button
                  onClick={() => {
                    const idx = selectedGuide.chapters.findIndex(c => c.id === currentChapter.id);
                    if (idx > 0) setActiveChapter(selectedGuide.chapters[idx - 1].id);
                  }}
                  disabled={selectedGuide.chapters[0].id === currentChapter.id}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white text-xs font-medium transition disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>

                <button onClick={() => markChapterDone(selectedGuide.id, currentChapter.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${completedSet.has(currentChapter.id) ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-violet-600 hover:bg-violet-500 text-white'}`}>
                  {completedSet.has(currentChapter.id) ? <><CheckCircle className="w-3.5 h-3.5" /> Completed</> : <>Mark Complete <ChevronRight className="w-3.5 h-3.5" /></>}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* AI Companion panel */}
      <AnimatePresence>
        {showAI && (
          <motion.div
            className="w-80 flex-shrink-0 bg-[#0d0d0d] border-l border-[#1f1f1f] flex flex-col"
            initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
            style={{ minHeight: '100%', maxHeight: '82vh' }}>

            {/* AI header */}
            <div className="px-4 py-4 border-b border-[#1f1f1f] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{selectedGuide.aiPersona}</p>
                  <p className="text-[10px] text-violet-400">Guide AI Companion</p>
                </div>
              </div>
              <button onClick={() => setShowAI(false)} className="p-1.5 rounded-lg hover:bg-[#1A1A1A] text-gray-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Suggested prompts */}
            {messages.length <= 1 && (
              <div className="px-4 py-3 border-b border-[#1f1f1f] flex-shrink-0">
                <p className="text-[10px] text-gray-500 mb-2 font-semibold uppercase tracking-wide">Try asking</p>
                <div className="flex flex-col gap-1.5">
                  {['Summarize this guide', 'Give me a checklist', 'What are the NH legal notes?', 'What are the maintenance tips?'].map((prompt, i) => (
                    <button key={i} onClick={() => { setInput(prompt); setTimeout(() => sendMessage(), 50); }}
                      className="text-left px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-xs text-gray-400 hover:text-white hover:border-violet-500/30 transition">
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-violet-600 text-white rounded-br-md' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 rounded-bl-md'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {aiTyping && (
                <div className="flex justify-start">
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-[#1f1f1f] flex-shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={`Ask ${selectedGuide.aiPersona}…`}
                  className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] focus:border-violet-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition placeholder-gray-600"
                />
                <button onClick={sendMessage} disabled={!input.trim()}
                  className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition disabled:opacity-40 flex-shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
