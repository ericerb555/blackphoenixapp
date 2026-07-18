import { useState, useEffect, useRef } from 'react';
import { Printer, X, ChevronRight, ArrowLeft, ExternalLink, Download, BookOpen, ShoppingBag } from 'lucide-react';

// Import all 21 documents
import NH_LandlordOpsManual from './documents/NH_LandlordOpsManual';
import CondoBoardHandbook from './documents/CondoBoardHandbook';
import HomeownerGuide from './documents/HomeownerGuide';
import CapitalPlanningGuide from './documents/CapitalPlanningGuide';
import DIYRepairEncyclopedia from './documents/DIYRepairEncyclopedia';
import NH_LeaseTemplatePack from './documents/NH_LeaseTemplatePack';
import InspectionReportTemplate from './documents/InspectionReportTemplate';
import VendorContractPack from './documents/VendorContractPack';
import BoardMeetingPackage from './documents/BoardMeetingPackage';
import PropertyROICalculator from './documents/PropertyROICalculator';
import ReserveFundCalculator from './documents/ReserveFundCalculator';
import EVChargingCalculator from './documents/EVChargingCalculator';
import RentalPricingOptimizer from './documents/RentalPricingOptimizer';
import AIPropertyHealthReport from './documents/AIPropertyHealthReport';
import RevenueOpportunityAnalysis from './documents/RevenueOpportunityAnalysis';
import AI_CapitalPlan from './documents/AI_CapitalPlan';
import NH_WinterPrepPackage from './documents/NH_WinterPrepPackage';
import AnnualMaintenancePlanner from './documents/AnnualMaintenancePlanner';
import BundleLandlordStarter from './documents/BundleLandlordStarter';
import BundleCondoComplete from './documents/BundleCondoComplete';
import BundlePMPro from './documents/BundlePMPro';

// ─── Document registry ────────────────────────────────────────────────────────

const DOCS: Record<string, {
  component: React.ComponentType;
  title: string;
  category: string;
  color: string;
  toc: { id: string; label: string }[];
}> = {
  'eb-landlord-ops': {
    component: NH_LandlordOpsManual,
    title: 'NH Landlord Operations Manual',
    category: 'Ebook · 85 pages',
    color: 'text-teal-400',
    toc: [
      { id: 'intro', label: 'Introduction' },
      { id: 'rsa540', label: 'RSA 540 Overview' },
      { id: 'screening', label: 'Tenant Screening' },
      { id: 'lease', label: 'Lease Agreements' },
      { id: 'deposits', label: 'Security Deposits' },
      { id: 'habitability', label: 'Habitability Standards' },
      { id: 'entry', label: 'Entry & Privacy' },
      { id: 'maintenance', label: 'Maintenance' },
      { id: 'eviction', label: 'Eviction Process' },
      { id: 'resources', label: 'NH Resources' },
    ],
  },
  'eb-condo-board': {
    component: CondoBoardHandbook,
    title: 'Condo Board Governance Handbook',
    category: 'Ebook · 72 pages',
    color: 'text-violet-400',
    toc: [
      { id: 'intro', label: 'Introduction' },
      { id: 'rsa356b', label: 'RSA 356-B Overview' },
      { id: 'roles', label: 'Board Roles & Duties' },
      { id: 'meetings', label: 'Meeting Procedures' },
      { id: 'finances', label: 'Financial Management' },
      { id: 'reserves', label: 'Reserve Funds' },
      { id: 'assessments', label: 'Special Assessments' },
      { id: 'vendors', label: 'Vendor Management' },
      { id: 'disputes', label: 'Owner Disputes' },
      { id: 'resources', label: 'NH Resources' },
    ],
  },
  'eb-homeowner-guide': {
    component: HomeownerGuide,
    title: 'First-Time Homeowner Complete Guide',
    category: 'Ebook · 58 pages',
    color: 'text-blue-400',
    toc: [
      { id: 'day-one', label: 'Day One Orientation' },
      { id: 'systems', label: 'Know Your Home Systems' },
      { id: 'seasonal', label: 'NH Seasonal Calendar' },
      { id: 'budget', label: 'Maintenance Budget' },
      { id: 'emergency', label: 'Emergency Preparedness' },
      { id: 'contractors', label: 'Finding Contractors' },
      { id: 'rebates', label: 'NH Energy Rebates' },
      { id: 'improvements', label: 'Smart Improvements' },
    ],
  },
  'eb-capital-planning': {
    component: CapitalPlanningGuide,
    title: 'Capital Planning for Property Managers',
    category: 'Ebook · 45 pages',
    color: 'text-orange-400',
    toc: [
      { id: 'intro', label: 'What is Capital Planning?' },
      { id: 'inventory', label: 'Component Inventory' },
      { id: 'reserve-study', label: 'Reserve Studies' },
      { id: 'funding', label: 'Funding Models' },
      { id: 'financing', label: 'Financing Options' },
      { id: 'execution', label: 'Project Execution' },
      { id: 'communication', label: 'Owner Communication' },
    ],
  },
  'eb-diy-repair': {
    component: DIYRepairEncyclopedia,
    title: 'DIY Home Repair Encyclopedia',
    category: 'Ebook · 120 pages',
    color: 'text-amber-400',
    toc: [
      { id: 'safety', label: 'Safety First' },
      { id: 'plumbing', label: 'Plumbing' },
      { id: 'electrical', label: 'Electrical Safety' },
      { id: 'drywall', label: 'Drywall & Painting' },
      { id: 'weatherproofing', label: 'Weatherproofing' },
      { id: 'winterization', label: 'NH Winterization' },
      { id: 'flooring', label: 'Flooring' },
      { id: 'appliances', label: 'Appliances' },
      { id: 'hire-pro', label: 'When to Hire a Pro' },
    ],
  },
  'tmpl-nh-lease': {
    component: NH_LeaseTemplatePack,
    title: 'NH Lease Agreement Template Pack',
    category: 'Template Pack',
    color: 'text-green-400',
    toc: [
      { id: 'intro', label: 'How to Use These Templates' },
      { id: 'standard-lease', label: 'Standard 12-Month Lease' },
      { id: 'mtm-lease', label: 'Month-to-Month Lease' },
      { id: 'room-rental', label: 'Room Rental Agreement' },
      { id: 'pet-addendum', label: 'Pet Addendum' },
      { id: 'move-in-checklist', label: 'Move-In Checklist' },
    ],
  },
  'tmpl-inspection': {
    component: InspectionReportTemplate,
    title: 'Property Inspection Report Template',
    category: 'Template · Interactive',
    color: 'text-indigo-400',
    toc: [
      { id: 'instructions', label: 'Instructions' },
      { id: 'exterior', label: 'Exterior' },
      { id: 'common-areas', label: 'Common Areas' },
      { id: 'kitchen', label: 'Kitchen' },
      { id: 'bathroom', label: 'Bathrooms' },
      { id: 'bedrooms', label: 'Bedrooms & Living' },
      { id: 'mechanical', label: 'Mechanical Systems' },
      { id: 'signatures', label: 'Signatures' },
    ],
  },
  'tmpl-vendor-contract': {
    component: VendorContractPack,
    title: 'Vendor Contract Template Pack',
    category: 'Template Pack · 5 Contracts',
    color: 'text-amber-400',
    toc: [
      { id: 'intro', label: 'How to Use' },
      { id: 'hvac', label: 'HVAC Contract' },
      { id: 'landscaping', label: 'Landscaping & Snow' },
      { id: 'cleaning', label: 'Cleaning Services' },
      { id: 'handyman', label: 'Handyman Contract' },
      { id: 'mgmt', label: 'Management Agreement' },
    ],
  },
  'tmpl-board-meeting': {
    component: BoardMeetingPackage,
    title: 'Board Meeting Package',
    category: 'Template Pack · 6 Templates',
    color: 'text-violet-400',
    toc: [
      { id: 'intro', label: 'Overview' },
      { id: 'agenda', label: 'Meeting Agenda' },
      { id: 'minutes', label: 'Meeting Minutes' },
      { id: 'action-items', label: 'Action Item Tracker' },
      { id: 'notice', label: 'Owner Notice Letter' },
      { id: 'proxy', label: 'Proxy Voting Form' },
    ],
  },
  'calc-roi': {
    component: PropertyROICalculator,
    title: 'Property ROI Calculator',
    category: 'Interactive Calculator',
    color: 'text-lime-400',
    toc: [
      { id: 'purchase', label: 'Purchase Details' },
      { id: 'income', label: 'Income & Expenses' },
      { id: 'results', label: 'Results Dashboard' },
      { id: 'projection', label: '10-Year Projection' },
      { id: 'guide', label: 'How to Read Results' },
    ],
  },
  'calc-reserve': {
    component: ReserveFundCalculator,
    title: 'Reserve Fund Adequacy Calculator',
    category: 'Interactive Calculator',
    color: 'text-orange-400',
    toc: [
      { id: 'components', label: 'Component Inventory' },
      { id: 'current', label: 'Current Fund Balance' },
      { id: 'results', label: 'Adequacy Results' },
      { id: 'scenarios', label: 'Funding Scenarios' },
      { id: 'guide', label: 'Understanding Results' },
    ],
  },
  'calc-ev-roi': {
    component: EVChargingCalculator,
    title: 'EV Charging Revenue Calculator',
    category: 'Interactive Calculator',
    color: 'text-emerald-400',
    toc: [
      { id: 'install', label: 'Installation Costs' },
      { id: 'rebates', label: 'NH Eversource Rebates' },
      { id: 'revenue', label: 'Revenue Projections' },
      { id: 'results', label: 'ROI Results' },
    ],
  },
  'calc-rental-pricing': {
    component: RentalPricingOptimizer,
    title: 'Rental Pricing Optimizer',
    category: 'Interactive Calculator',
    color: 'text-cyan-400',
    toc: [
      { id: 'unit', label: 'Unit Details' },
      { id: 'market', label: 'Market Comparables' },
      { id: 'adjustments', label: 'Adjustments' },
      { id: 'recommendation', label: 'Optimal Rent' },
    ],
  },
  'air-property-health': {
    component: AIPropertyHealthReport,
    title: 'AI Property Health Report',
    category: 'AI Report Generator',
    color: 'text-violet-400',
    toc: [
      { id: 'property-info', label: 'Property Details' },
      { id: 'systems', label: 'Systems Assessment' },
      { id: 'risk', label: 'Risk Flags' },
      { id: 'action-plan', label: '90-Day Action Plan' },
      { id: 'capital', label: 'Capital Needs' },
    ],
  },
  'air-revenue-opp': {
    component: RevenueOpportunityAnalysis,
    title: 'Revenue Opportunity Analysis',
    category: 'AI Report Generator',
    color: 'text-emerald-400',
    toc: [
      { id: 'portfolio', label: 'Portfolio Overview' },
      { id: 'pricing-gaps', label: 'Pricing Gaps' },
      { id: 'ancillary', label: 'Ancillary Revenue' },
      { id: 'roadmap', label: '12-Month Roadmap' },
    ],
  },
  'air-capital-plan': {
    component: AI_CapitalPlan,
    title: 'AI 10-Year Capital Plan',
    category: 'AI Report Generator',
    color: 'text-orange-400',
    toc: [
      { id: 'inventory', label: 'Component Inventory' },
      { id: 'schedule', label: 'Replacement Schedule' },
      { id: 'funding', label: 'Funding Plan' },
      { id: 'scenarios', label: 'Scenarios' },
      { id: 'presentation', label: 'Board Summary' },
    ],
  },
  'maint-nh-winter': {
    component: NH_WinterPrepPackage,
    title: 'NH Winter Prep Package',
    category: 'Maintenance Package',
    color: 'text-blue-400',
    toc: [
      { id: 'overview', label: 'Overview' },
      { id: 'exterior', label: 'Exterior & Roof' },
      { id: 'heating', label: 'Heating Systems' },
      { id: 'plumbing', label: 'Plumbing & Pipes' },
      { id: 'insulation', label: 'Insulation & Air Sealing' },
      { id: 'schedule', label: 'Vendor Schedule' },
      { id: 'storm', label: 'Storm Response Protocol' },
    ],
  },
  'maint-annual-planner': {
    component: AnnualMaintenancePlanner,
    title: 'Annual Maintenance Planner',
    category: 'Maintenance Package',
    color: 'text-green-400',
    toc: [
      { id: 'jan-feb', label: 'Jan – Feb' },
      { id: 'mar-apr', label: 'Mar – Apr' },
      { id: 'may-jun', label: 'May – Jun' },
      { id: 'jul-aug', label: 'Jul – Aug' },
      { id: 'sep-oct', label: 'Sep – Oct' },
      { id: 'nov-dec', label: 'Nov – Dec' },
      { id: 'budget', label: 'Budget Tracker' },
    ],
  },
  'bundle-landlord-starter': {
    component: BundleLandlordStarter,
    title: 'Landlord Starter Bundle',
    category: 'Bundle · 3 Products',
    color: 'text-orange-400',
    toc: [
      { id: 'contents', label: "What's Included" },
      { id: 'quick-start', label: 'Quick Start Guide' },
      { id: 'landlord-ops', label: 'Landlord Operations Manual' },
      { id: 'lease-pack', label: 'Lease Agreement Pack' },
      { id: 'inspection', label: 'Inspection Template' },
    ],
  },
  'bundle-condo-complete': {
    component: BundleCondoComplete,
    title: 'Condo Board Complete Bundle',
    category: 'Bundle · 3 Products',
    color: 'text-violet-400',
    toc: [
      { id: 'contents', label: "What's Included" },
      { id: 'quick-start', label: 'Quick Start Guide' },
      { id: 'handbook', label: 'Governance Handbook' },
      { id: 'meeting-pkg', label: 'Meeting Package' },
      { id: 'reserve-calc', label: 'Reserve Calculator' },
    ],
  },
  'bundle-pm-pro': {
    component: BundlePMPro,
    title: 'Property Manager Pro Bundle',
    category: 'Bundle · 4 Products',
    color: 'text-orange-400',
    toc: [
      { id: 'contents', label: "What's Included" },
      { id: 'quick-start', label: 'Quick Start Guide' },
      { id: 'capital', label: 'Capital Planning Guide' },
      { id: 'vendor', label: 'Vendor Contracts' },
      { id: 'roi', label: 'ROI Calculator' },
      { id: 'planner', label: 'Maintenance Planner' },
    ],
  },
};

// ─── DocumentViewer ────────────────────────────────────────────────────────────

interface Props {
  productId?: string;
}

export default function DocumentViewer({ productId }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  const id = productId || new URLSearchParams(window.location.search).get('id') || new URLSearchParams(window.location.hash.replace(/^[^?]*/, '')).get('id') || 'eb-landlord-ops';
  const doc = DOCS[id];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!doc) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Document not found: <code className="text-orange-400">{id}</code></p>
          <button onClick={() => (window as any).__navigateApp?.('/store')}
            className="px-4 py-2 bg-orange-600 rounded-lg text-sm font-bold">
            Back to Store
          </button>
        </div>
      </div>
    );
  }

  const DocComponent = doc.component;

  function scrollTo(sectionId: string) {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full { max-width: 100% !important; margin: 0 !important; }
          body { background: white !important; color: black !important; }
          #doc-content { padding: 0 !important; }
        }
      `}</style>

      {/* Top bar */}
      <div className="no-print sticky top-0 z-40 bg-[#0A0A0A]/95 border-b border-[#1E1E1E] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => (window as any).__navigateApp?.('/store')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition">
            <ArrowLeft className="w-4 h-4" /> Store
          </button>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          <span className="text-xs text-gray-500 truncate max-w-xs">{doc.title}</span>
          <div className="flex-1" />
          <span className={`text-xs font-semibold ${doc.color} hidden sm:block`}>{doc.category}</span>
          <button onClick={() => setSidebarOpen(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-xs transition">
            <BookOpen className="w-3.5 h-3.5" /> Contents
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-xs transition">
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </button>
          <button onClick={() => (window as any).__navigateApp?.('/store')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition">
            <ShoppingBag className="w-3.5 h-3.5" /> More Products
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex gap-6 px-4 py-8">
        {/* TOC sidebar */}
        {sidebarOpen && (
          <aside className="no-print w-56 flex-shrink-0 sticky top-20 self-start">
            <div className="bg-[#111] border border-[#1E1E1E] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1E1E1E] flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contents</p>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-600 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <nav className="p-2">
                {doc.toc.map(item => (
                  <button key={item.id} onClick={() => scrollTo(item.id)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#1A1A1A] transition">
                    {item.label}
                  </button>
                ))}
              </nav>
              <div className="px-4 py-3 border-t border-[#1E1E1E]">
                <a href="https://www.nh.gov/nhcourts" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition">
                  NH Courts <ExternalLink className="w-3 h-3" />
                </a>
                <a href="https://www.nhes.nh.gov" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition mt-1">
                  NH Employment <ExternalLink className="w-3 h-3" />
                </a>
                <a href="https://www.eversource.com/nh" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition mt-1">
                  Eversource NH <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </aside>
        )}

        {/* Main content */}
        <main id="doc-content" ref={contentRef} className="flex-1 min-w-0 max-w-4xl">
          <DocComponent />
        </main>
      </div>
    </div>
  );
}
