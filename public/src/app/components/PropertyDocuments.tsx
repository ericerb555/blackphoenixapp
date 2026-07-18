/**
 * PropertyAI Enterprise — Phase 2: Document Intelligence
 * Drag-and-drop document organizer with rules-based AI extraction simulation,
 * searchable property history, timeline view, and missing-document flagging.
 */
import { useState, useRef, useMemo, useCallback } from 'react';
import {
  FileText, Upload, Search, Filter, X, CheckCircle, AlertTriangle,
  Clock, Tag, Eye, Edit2, Save, Trash2, ChevronRight, Download,
  Image, File, Shield, BookOpen, DollarSign, Wrench, Home,
  AlertCircle, ThumbsUp, ThumbsDown, Zap, Bot, Layers,
  Calendar, Building2, Star, MoreVertical, FolderOpen,
  RefreshCw, SortAsc, List, Grid, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type DocCategory =
  | 'inspection' | 'warranty' | 'manual' | 'invoice'
  | 'insurance' | 'lease' | 'photo' | 'reserve_study'
  | 'governing' | 'financial' | 'permit' | 'maintenance';

type ProcessingStatus = 'uploading' | 'extracting' | 'ready' | 'review_needed' | 'approved' | 'rejected';

interface AIExtractedField {
  key: string;
  label: string;
  value: string;
  confidence: number; // 0–100
  userEdited: boolean;
}

interface PropertyDocument {
  id: string;
  name: string;
  originalName: string;
  category: DocCategory;
  uploadedAt: string;
  documentDate: string | null; // date on the document itself
  fileType: string; // 'pdf' | 'jpg' | 'png' | 'xlsx' | 'docx' | 'csv'
  fileSizeKB: number;
  tags: string[];
  propertySystem: string | null;
  status: ProcessingStatus;
  aiExtracted: AIExtractedField[];
  userNotes: string;
  flaggedMissing: boolean;
}

// ─── Category config ──────────────────────────────────────────────────────────

const CAT_CONFIG: Record<DocCategory, { label: string; icon: any; color: string; bg: string; description: string }> = {
  inspection:    { label: 'Inspection Reports', icon: Eye,         color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',    description: 'Annual inspections, walkthroughs, code compliance' },
  warranty:      { label: 'Warranties',          icon: Shield,      color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20',  description: 'Equipment and system warranties' },
  manual:        { label: 'Manuals',             icon: BookOpen,    color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20',description: 'Equipment and appliance manuals' },
  invoice:       { label: 'Invoices & Receipts', icon: DollarSign,  color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20',  description: 'Contractor invoices, supply receipts' },
  insurance:     { label: 'Insurance',           icon: Shield,      color: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/20',    description: 'Policies, declarations, claims' },
  lease:         { label: 'Leases & Contracts',  icon: FileText,    color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20',description: 'Tenant leases, vendor contracts' },
  photo:         { label: 'Photos & Media',      icon: Image,       color: 'text-pink-400',   bg: 'bg-pink-500/10 border-pink-500/20',    description: 'Property photos, condition documentation' },
  reserve_study: { label: 'Reserve Studies',     icon: BarChartIcon,color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20',description: 'Reserve fund studies and projections' },
  governing:     { label: 'Governing Documents', icon: Layers,      color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20',description: 'Bylaws, CC&Rs, HOA rules' },
  financial:     { label: 'Financial Records',   icon: DollarSign,  color: 'text-lime-400',   bg: 'bg-lime-500/10 border-lime-500/20',    description: 'P&L statements, tax records, budgets' },
  permit:        { label: 'Permits & Certificates', icon: Star,     color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20',description: 'Building permits, CO, fire certificates' },
  maintenance:   { label: 'Maintenance Records', icon: Wrench,      color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',      description: 'Service logs, work orders, repairs' },
};

function BarChartIcon(props: any) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="10" width="4" height="11"/><rect x="10" y="6" width="4" height="15"/><rect x="17" y="2" width="4" height="19"/></svg>;
}

// ─── Rules-based AI extraction ────────────────────────────────────────────────

function simulateAIExtraction(doc: Omit<PropertyDocument, 'aiExtracted' | 'status'>): AIExtractedField[] {
  const name = doc.name.toLowerCase();
  const fields: AIExtractedField[] = [];

  // Document date — always attempted
  fields.push({
    key: 'doc_date', label: 'Document Date',
    value: doc.documentDate || new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    confidence: 85, userEdited: false,
  });

  if (doc.category === 'invoice' || doc.category === 'maintenance') {
    fields.push(
      { key: 'vendor', label: 'Vendor / Contractor', value: pickVendor(name), confidence: 78, userEdited: false },
      { key: 'amount', label: 'Amount', value: `$${(Math.floor(Math.random() * 4500) + 200).toLocaleString()}`, confidence: 91, userEdited: false },
      { key: 'system', label: 'Property System', value: pickSystem(name), confidence: 72, userEdited: false },
      { key: 'work_desc', label: 'Work Description', value: pickWorkDesc(name), confidence: 68, userEdited: false },
    );
  }

  if (doc.category === 'inspection') {
    fields.push(
      { key: 'inspector', label: 'Inspector Name', value: pickInspector(), confidence: 82, userEdited: false },
      { key: 'overall', label: 'Overall Result', value: Math.random() > 0.3 ? 'Pass' : 'Conditional Pass', confidence: 88, userEdited: false },
      { key: 'items_flagged', label: 'Items Flagged', value: String(Math.floor(Math.random() * 5)), confidence: 75, userEdited: false },
      { key: 'next_due', label: 'Next Inspection Due', value: nextYear(), confidence: 80, userEdited: false },
    );
  }

  if (doc.category === 'warranty') {
    fields.push(
      { key: 'equipment', label: 'Equipment / System', value: pickSystem(name), confidence: 85, userEdited: false },
      { key: 'manufacturer', label: 'Manufacturer', value: pickManufacturer(), confidence: 79, userEdited: false },
      { key: 'expiry', label: 'Warranty Expiry', value: futureDate(2, 10), confidence: 88, userEdited: false },
      { key: 'coverage', label: 'Coverage Type', value: Math.random() > 0.5 ? 'Parts & Labor' : 'Parts Only', confidence: 73, userEdited: false },
    );
  }

  if (doc.category === 'insurance') {
    fields.push(
      { key: 'carrier', label: 'Insurance Carrier', value: pickCarrier(), confidence: 92, userEdited: false },
      { key: 'policy_num', label: 'Policy Number', value: `POL-${Math.floor(Math.random() * 9000000) + 1000000}`, confidence: 94, userEdited: false },
      { key: 'coverage_amt', label: 'Coverage Amount', value: `$${(Math.floor(Math.random() * 900) + 100) * 1000}`, confidence: 87, userEdited: false },
      { key: 'renewal', label: 'Renewal Date', value: futureDate(0, 14), confidence: 89, userEdited: false },
    );
  }

  if (doc.category === 'lease') {
    fields.push(
      { key: 'tenant', label: 'Tenant Name', value: pickTenant(), confidence: 90, userEdited: false },
      { key: 'unit', label: 'Unit', value: `Unit ${Math.floor(Math.random() * 20) + 101}`, confidence: 88, userEdited: false },
      { key: 'rent', label: 'Monthly Rent', value: `$${(Math.floor(Math.random() * 1200) + 800).toLocaleString()}`, confidence: 91, userEdited: false },
      { key: 'lease_end', label: 'Lease End Date', value: futureDate(1, 24), confidence: 86, userEdited: false },
    );
  }

  if (doc.category === 'permit') {
    fields.push(
      { key: 'permit_num', label: 'Permit Number', value: `NH-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`, confidence: 93, userEdited: false },
      { key: 'issuing_auth', label: 'Issuing Authority', value: 'City of Concord Building Dept.', confidence: 85, userEdited: false },
      { key: 'scope', label: 'Permit Scope', value: pickPermitScope(), confidence: 74, userEdited: false },
      { key: 'expiry', label: 'Permit Expiry', value: futureDate(0, 6), confidence: 82, userEdited: false },
    );
  }

  if (doc.category === 'financial') {
    fields.push(
      { key: 'period', label: 'Reporting Period', value: pickPeriod(), confidence: 87, userEdited: false },
      { key: 'total_income', label: 'Total Income', value: `$${(Math.floor(Math.random() * 80000) + 20000).toLocaleString()}`, confidence: 84, userEdited: false },
      { key: 'total_expenses', label: 'Total Expenses', value: `$${(Math.floor(Math.random() * 40000) + 10000).toLocaleString()}`, confidence: 84, userEdited: false },
    );
  }

  if (doc.category === 'reserve_study') {
    fields.push(
      { key: 'firm', label: 'Study Firm', value: 'NH Reserve Analysis Group', confidence: 81, userEdited: false },
      { key: 'funded_pct', label: 'Percent Funded', value: `${Math.floor(Math.random() * 60) + 30}%`, confidence: 88, userEdited: false },
      { key: 'recommended_contribution', label: 'Recommended Annual Contribution', value: `$${(Math.floor(Math.random() * 30000) + 5000).toLocaleString()}`, confidence: 85, userEdited: false },
    );
  }

  return fields;
}

function pickVendor(name: string) {
  const vendors = ['ABC Plumbing & Heating', 'NH Electric Services', 'Concord Roofing Co.', 'Green Mountain HVAC', 'Merrimack Valley Contractors', 'Patriot Property Services', 'Lakes Region Maintenance'];
  if (name.includes('hvac') || name.includes('heat')) return 'Green Mountain HVAC';
  if (name.includes('roof')) return 'Concord Roofing Co.';
  if (name.includes('electric')) return 'NH Electric Services';
  if (name.includes('plumb')) return 'ABC Plumbing & Heating';
  return vendors[Math.floor(Math.random() * vendors.length)];
}

function pickSystem(name: string) {
  if (name.includes('roof')) return 'Roof';
  if (name.includes('hvac') || name.includes('heat') || name.includes('ac')) return 'HVAC System';
  if (name.includes('plumb') || name.includes('water')) return 'Plumbing';
  if (name.includes('electric')) return 'Electrical';
  if (name.includes('fire')) return 'Fire Safety';
  const systems = ['HVAC System', 'Roof', 'Plumbing', 'Electrical Panel', 'Water Heater', 'Foundation'];
  return systems[Math.floor(Math.random() * systems.length)];
}

function pickWorkDesc(name: string) {
  const descs = ['Annual service and filter replacement', 'Emergency repair — leak remediation', 'Preventive maintenance inspection', 'Component replacement per inspection report', 'Scheduled replacement at end of lifespan'];
  return descs[Math.floor(Math.random() * descs.length)];
}

function pickInspector() {
  return ['James Whitfield, NH Lic. #4421', 'Carol Dupont, NH Lic. #3892', 'Mike Okafor, NH Lic. #5104'][Math.floor(Math.random() * 3)];
}

function pickManufacturer() {
  return ['Carrier', 'Trane', 'Rheem', 'Lennox', 'Bradford White', 'Square D', 'Andersen'][Math.floor(Math.random() * 7)];
}

function pickCarrier() {
  return ['Granite State Mutual', 'NH Farm Bureau Insurance', 'Travelers', 'Liberty Mutual', 'State Farm'][Math.floor(Math.random() * 5)];
}

function pickTenant() {
  const names = ['Jordan Mitchell', 'Patricia Nguyen', 'Darius Hall', 'Lauren Kowalski', 'Tony Reyes', 'Amber Schmidt'];
  return names[Math.floor(Math.random() * names.length)];
}

function pickPermitScope() {
  return ['Electrical upgrade — panel replacement', 'Plumbing — water heater replacement', 'Roofing — full replacement', 'HVAC — new system installation', 'Addition — deck construction'][Math.floor(Math.random() * 5)];
}

function pickPeriod() {
  const year = new Date().getFullYear() - Math.floor(Math.random() * 2);
  return [`Q1 ${year}`, `Q2 ${year}`, `Q3 ${year}`, `Q4 ${year}`, `FY ${year}`][Math.floor(Math.random() * 5)];
}

function nextYear() {
  const d = new Date(); d.setFullYear(d.getFullYear() + 1);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function futureDate(minYears: number, maxMonths: number) {
  const d = new Date();
  const months = Math.floor(Math.random() * (maxMonths - minYears * 12)) + minYears * 12;
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmt$(n: number) { return `$${n.toLocaleString()}`; }

// ─── Missing documents checklist ──────────────────────────────────────────────

const REQUIRED_DOC_TYPES: { category: DocCategory; label: string; nhNote?: string }[] = [
  { category: 'inspection',    label: 'Annual Property Inspection Report', nhNote: 'Recommended annually under NH RSA 540 for rental compliance.' },
  { category: 'insurance',     label: 'Current Property Insurance Policy', nhNote: 'NH law requires proof of insurance for financed properties.' },
  { category: 'warranty',      label: 'HVAC System Warranty', nhNote: 'Critical for NH winters — document your heating system warranty.' },
  { category: 'maintenance',   label: 'HVAC Annual Service Record' },
  { category: 'permit',        label: 'Certificate of Occupancy' },
  { category: 'financial',     label: 'Current Year P&L Statement' },
  { category: 'lease',         label: 'Active Tenant Lease(s)', nhNote: 'NH RSA 540-A governs tenant rights — keep signed leases on file.' },
  { category: 'reserve_study', label: 'Reserve Fund Study', nhNote: 'Required for NH condo associations under RSA 356-B.' },
];

// ─── Seed documents ───────────────────────────────────────────────────────────

function seedDocuments(): PropertyDocument[] {
  const now = Date.now();
  return [
    {
      id: 'd1', name: '2024 Annual Property Inspection', originalName: 'inspection_report_2024.pdf',
      category: 'inspection', uploadedAt: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
      documentDate: '2024-09-15', fileType: 'pdf', fileSizeKB: 842, tags: ['annual', '2024', 'passed'],
      propertySystem: null, status: 'approved',
      aiExtracted: [
        { key: 'inspector', label: 'Inspector Name', value: 'James Whitfield, NH Lic. #4421', confidence: 82, userEdited: false },
        { key: 'overall', label: 'Overall Result', value: 'Pass', confidence: 95, userEdited: false },
        { key: 'items_flagged', label: 'Items Flagged', value: '2', confidence: 88, userEdited: false },
        { key: 'next_due', label: 'Next Inspection Due', value: 'September 2025', confidence: 80, userEdited: false },
      ],
      userNotes: '', flaggedMissing: false,
    },
    {
      id: 'd2', name: 'Eversource NH Rebate — HVAC Upgrade', originalName: 'eversource_rebate_hvac.pdf',
      category: 'financial', uploadedAt: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(),
      documentDate: '2024-07-01', fileType: 'pdf', fileSizeKB: 215, tags: ['rebate', 'hvac', 'eversource'],
      propertySystem: 'HVAC System', status: 'approved',
      aiExtracted: [
        { key: 'vendor', label: 'Issuing Entity', value: 'Eversource NH', confidence: 94, userEdited: false },
        { key: 'amount', label: 'Rebate Amount', value: '$750', confidence: 97, userEdited: false },
        { key: 'period', label: 'Reporting Period', value: 'Q3 2024', confidence: 87, userEdited: false },
      ],
      userNotes: 'Filed with 2024 tax return.', flaggedMissing: false,
    },
    {
      id: 'd3', name: 'Roof Replacement Invoice — Concord Roofing', originalName: 'invoice_roof_2023.pdf',
      category: 'invoice', uploadedAt: new Date(now - 180 * 24 * 60 * 60 * 1000).toISOString(),
      documentDate: '2023-10-12', fileType: 'pdf', fileSizeKB: 318, tags: ['roof', 'replacement', '2023'],
      propertySystem: 'Roof', status: 'approved',
      aiExtracted: [
        { key: 'vendor', label: 'Vendor / Contractor', value: 'Concord Roofing Co.', confidence: 94, userEdited: false },
        { key: 'amount', label: 'Amount', value: '$18,400', confidence: 96, userEdited: false },
        { key: 'system', label: 'Property System', value: 'Roof', confidence: 99, userEdited: false },
        { key: 'work_desc', label: 'Work Description', value: 'Full roof tear-off and replacement — architectural shingles, 30-year warranty', confidence: 88, userEdited: false },
      ],
      userNotes: '', flaggedMissing: false,
    },
    {
      id: 'd4', name: 'Landlord Property Insurance Policy 2024', originalName: 'insurance_policy_2024.pdf',
      category: 'insurance', uploadedAt: new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString(),
      documentDate: '2024-01-01', fileType: 'pdf', fileSizeKB: 1240, tags: ['insurance', '2024', 'landlord'],
      propertySystem: null, status: 'approved',
      aiExtracted: [
        { key: 'carrier', label: 'Insurance Carrier', value: 'Granite State Mutual', confidence: 93, userEdited: false },
        { key: 'policy_num', label: 'Policy Number', value: 'POL-4829104', confidence: 97, userEdited: false },
        { key: 'coverage_amt', label: 'Coverage Amount', value: '$850,000', confidence: 91, userEdited: false },
        { key: 'renewal', label: 'Renewal Date', value: 'January 1, 2026', confidence: 94, userEdited: false },
      ],
      userNotes: '', flaggedMissing: false,
    },
    {
      id: 'd5', name: 'Unit 4 Lease — Patricia Nguyen', originalName: 'lease_unit4_nguyen.pdf',
      category: 'lease', uploadedAt: new Date(now - 120 * 24 * 60 * 60 * 1000).toISOString(),
      documentDate: '2024-05-01', fileType: 'pdf', fileSizeKB: 520, tags: ['lease', 'unit-4', 'active'],
      propertySystem: null, status: 'approved',
      aiExtracted: [
        { key: 'tenant', label: 'Tenant Name', value: 'Patricia Nguyen', confidence: 97, userEdited: false },
        { key: 'unit', label: 'Unit', value: 'Unit 4', confidence: 98, userEdited: false },
        { key: 'rent', label: 'Monthly Rent', value: '$1,450', confidence: 95, userEdited: false },
        { key: 'lease_end', label: 'Lease End Date', value: 'April 30, 2026', confidence: 91, userEdited: false },
      ],
      userNotes: '', flaggedMissing: false,
    },
    {
      id: 'd6', name: 'HVAC Service Record — Spring 2024', originalName: 'hvac_service_spring2024.pdf',
      category: 'maintenance', uploadedAt: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(),
      documentDate: '2024-04-18', fileType: 'pdf', fileSizeKB: 180, tags: ['hvac', 'service', '2024'],
      propertySystem: 'HVAC System', status: 'review_needed',
      aiExtracted: [
        { key: 'vendor', label: 'Vendor / Contractor', value: 'Green Mountain HVAC', confidence: 91, userEdited: false },
        { key: 'amount', label: 'Amount', value: '$285', confidence: 88, userEdited: false },
        { key: 'system', label: 'Property System', value: 'HVAC System', confidence: 96, userEdited: false },
        { key: 'work_desc', label: 'Work Description', value: 'Annual tune-up, filter replacement, refrigerant check', confidence: 79, userEdited: false },
      ],
      userNotes: '', flaggedMissing: false,
    },
    {
      id: 'd7', name: 'Building Permit — Water Heater 2022', originalName: 'permit_waterheater_2022.pdf',
      category: 'permit', uploadedAt: new Date(now - 400 * 24 * 60 * 60 * 1000).toISOString(),
      documentDate: '2022-08-03', fileType: 'pdf', fileSizeKB: 95, tags: ['permit', 'water-heater', '2022'],
      propertySystem: 'Water Heater', status: 'approved',
      aiExtracted: [
        { key: 'permit_num', label: 'Permit Number', value: 'NH-2022-44812', confidence: 96, userEdited: false },
        { key: 'issuing_auth', label: 'Issuing Authority', value: 'City of Concord Building Dept.', confidence: 90, userEdited: false },
        { key: 'scope', label: 'Permit Scope', value: 'Plumbing — water heater replacement', confidence: 92, userEdited: false },
        { key: 'expiry', label: 'Permit Expiry', value: 'February 3, 2023', confidence: 88, userEdited: false },
      ],
      userNotes: '', flaggedMissing: false,
    },
    {
      id: 'd8', name: 'Rooftop — Post-Replacement Photos (Oct 2023)', originalName: 'roof_photos_oct2023.zip',
      category: 'photo', uploadedAt: new Date(now - 150 * 24 * 60 * 60 * 1000).toISOString(),
      documentDate: '2023-10-15', fileType: 'zip', fileSizeKB: 8420, tags: ['roof', 'condition', 'post-work'],
      propertySystem: 'Roof', status: 'approved',
      aiExtracted: [
        { key: 'doc_date', label: 'Document Date', value: 'October 15, 2023', confidence: 82, userEdited: false },
        { key: 'system', label: 'Property System', value: 'Roof', confidence: 85, userEdited: false },
      ],
      userNotes: '12 photos, new architectural shingles, all flashing visible.', flaggedMissing: false,
    },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FILE_ICON: Record<string, any> = {
  pdf: FileText, jpg: Image, jpeg: Image, png: Image,
  xlsx: BarChartIcon, csv: BarChartIcon, docx: File, zip: File, default: File,
};

function getFileIcon(type: string) { return FILE_ICON[type.toLowerCase()] || FILE_ICON.default; }

const STATUS_CONFIG: Record<ProcessingStatus, { label: string; color: string; bg: string }> = {
  uploading:     { label: 'Uploading',      color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30' },
  extracting:    { label: 'AI Extracting',  color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/30' },
  ready:         { label: 'Pending Review', color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/30' },
  review_needed: { label: 'Review Needed',  color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  approved:      { label: 'Approved',       color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/30' },
  rejected:      { label: 'Rejected',       color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30' },
};

type ViewMode = 'list' | 'grid';
type SortKey = 'date' | 'name' | 'category' | 'size';

function formatBytes(kb: number) {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function makeFakeId() { return `d${Date.now().toString(36)}`; }

// ─── Upload processing simulation ─────────────────────────────────────────────

function guessCategory(fileName: string): DocCategory {
  const n = fileName.toLowerCase();
  if (n.includes('inspect')) return 'inspection';
  if (n.includes('warrant')) return 'warranty';
  if (n.includes('manual') || n.includes('guide')) return 'manual';
  if (n.includes('invoice') || n.includes('receipt') || n.includes('bill')) return 'invoice';
  if (n.includes('insur') || n.includes('policy')) return 'insurance';
  if (n.includes('lease') || n.includes('tenant') || n.includes('contract')) return 'lease';
  if (n.includes('photo') || n.includes('img') || n.includes('pic') || /\.(jpg|jpeg|png|heic)$/i.test(n)) return 'photo';
  if (n.includes('reserve')) return 'reserve_study';
  if (n.includes('bylaw') || n.includes('condo') || n.includes('hoa') || n.includes('governing')) return 'governing';
  if (n.includes('tax') || n.includes('p&l') || n.includes('financial') || n.includes('budget')) return 'financial';
  if (n.includes('permit') || n.includes('certif')) return 'permit';
  if (n.includes('service') || n.includes('repair') || n.includes('mainten') || n.includes('work')) return 'maintenance';
  return 'invoice'; // default
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PropertyDocuments() {
  const [docs, setDocs] = useState<PropertyDocument[]>(() => {
    try { const r = localStorage.getItem('bp_pai_docs'); return r ? JSON.parse(r) : seedDocuments(); }
    catch { return seedDocuments(); }
  });
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<DocCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ProcessingStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selected, setSelected] = useState<PropertyDocument | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = useState('');
  const [activeTab, setActiveTab] = useState<'library' | 'timeline' | 'missing'>('library');
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function persist(updated: PropertyDocument[]) {
    setDocs(updated);
    try { localStorage.setItem('bp_pai_docs', JSON.stringify(updated)); } catch {}
  }

  // ── Upload simulation ────────────────────────────────────────────────────────
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const tempId = makeFakeId();
      const category = guessCategory(file.name);
      const fileType = file.name.split('.').pop()?.toLowerCase() || 'pdf';

      const newDoc: PropertyDocument = {
        id: tempId,
        name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        originalName: file.name,
        category,
        uploadedAt: new Date().toISOString(),
        documentDate: null,
        fileType,
        fileSizeKB: Math.round(file.size / 1024) || Math.floor(Math.random() * 800 + 100),
        tags: [category],
        propertySystem: null,
        status: 'uploading',
        aiExtracted: [],
        userNotes: '',
        flaggedMissing: false,
      };

      setDocs(prev => {
        const next = [newDoc, ...prev];
        try { localStorage.setItem('bp_pai_docs', JSON.stringify(next)); } catch {}
        return next;
      });
      setProcessing(tempId);

      // Simulate upload → extracting → ready
      await delay(800);
      updateDocStatus(tempId, 'extracting');
      await delay(1200);

      const extracted = simulateAIExtraction(newDoc);
      const lowConf = extracted.some(f => f.confidence < 75);

      setDocs(prev => {
        const next = prev.map(d => d.id === tempId
          ? { ...d, status: lowConf ? 'review_needed' : 'ready' as ProcessingStatus, aiExtracted: extracted }
          : d
        );
        try { localStorage.setItem('bp_pai_docs', JSON.stringify(next)); } catch {}
        return next;
      });
      setProcessing(null);
      toast.success(`"${newDoc.name}" processed. ${lowConf ? 'Review AI extraction.' : 'Ready to approve.'}`);
    }
  }

  function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

  function updateDocStatus(id: string, status: ProcessingStatus) {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  }

  function approveDoc(id: string) {
    const next = docs.map(d => d.id === id ? { ...d, status: 'approved' as ProcessingStatus } : d);
    persist(next);
    if (selected?.id === id) setSelected({ ...selected, status: 'approved' });
    toast.success('Document approved.');
  }

  function rejectDoc(id: string) {
    const next = docs.map(d => d.id === id ? { ...d, status: 'rejected' as ProcessingStatus } : d);
    persist(next);
    if (selected?.id === id) setSelected({ ...selected, status: 'rejected' });
    toast.error('Document rejected.');
  }

  function deleteDoc(id: string) {
    const next = docs.filter(d => d.id !== id);
    persist(next);
    if (selected?.id === id) setSelected(null);
    toast.success('Document deleted.');
  }

  function saveField(docId: string, fieldKey: string, value: string) {
    const next = docs.map(d => d.id === docId
      ? { ...d, aiExtracted: d.aiExtracted.map(f => f.key === fieldKey ? { ...f, value, userEdited: true } : f) }
      : d
    );
    persist(next);
    const updatedDoc = next.find(d => d.id === docId)!;
    setSelected(updatedDoc);
    setEditingField(null);
    toast.success('Field updated.');
  }

  // ── Filtered + sorted docs ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = docs;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.tags.some(t => t.toLowerCase().includes(q)) ||
        d.aiExtracted.some(f => f.value.toLowerCase().includes(q))
      );
    }
    if (catFilter !== 'all') list = list.filter(d => d.category === catFilter);
    if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter);
    return [...list].sort((a, b) => {
      if (sortKey === 'date') return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'category') return a.category.localeCompare(b.category);
      if (sortKey === 'size') return b.fileSizeKB - a.fileSizeKB;
      return 0;
    });
  }, [docs, search, catFilter, statusFilter, sortKey]);

  // ── Missing docs check ───────────────────────────────────────────────────────
  const missingDocs = useMemo(() => {
    const presentCats = new Set(docs.filter(d => d.status !== 'rejected').map(d => d.category));
    return REQUIRED_DOC_TYPES.filter(r => !presentCats.has(r.category));
  }, [docs]);

  // ── Timeline ─────────────────────────────────────────────────────────────────
  const timeline = useMemo(() => {
    return [...docs]
      .filter(d => d.status === 'approved' && d.documentDate)
      .sort((a, b) => new Date(b.documentDate!).getTime() - new Date(a.documentDate!).getTime());
  }, [docs]);

  const reviewCount = docs.filter(d => d.status === 'ready' || d.status === 'review_needed').length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Sub-tab navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {(['library', 'timeline', 'missing'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition capitalize ${activeTab === t ? 'bg-violet-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
              {t === 'missing' ? `Missing Docs ${missingDocs.length > 0 ? `(${missingDocs.length})` : ''}` : t === 'library' ? `Document Library` : 'Timeline'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {reviewCount > 0 && (
            <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> {reviewCount} awaiting review
            </span>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition">
            <Upload className="w-4 h-4" /> Upload Documents
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv,.docx,.zip"
            onChange={e => handleFiles(e.target.files)} />
        </div>
      </div>

      {/* ── LIBRARY ───────────────────────────────────────────────────────────── */}
      {activeTab === 'library' && (
        <>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer ${dragging ? 'border-violet-500 bg-violet-500/10' : 'border-[#2A2A2A] hover:border-violet-500/40 hover:bg-violet-500/5'}`}>
            <Upload className={`w-8 h-8 mx-auto mb-3 ${dragging ? 'text-violet-400' : 'text-gray-600'}`} />
            <p className={`text-sm font-semibold ${dragging ? 'text-violet-300' : 'text-gray-400'}`}>
              {dragging ? 'Drop files to upload' : 'Drag & drop files here, or click to browse'}
            </p>
            <p className="text-xs text-gray-600 mt-1">PDF, JPG, PNG, XLSX, DOCX, ZIP — AI will auto-categorize and extract data</p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents, vendors, amounts…"
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] focus:border-violet-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none transition" />
            </div>

            <select value={catFilter} onChange={e => setCatFilter(e.target.value as any)}
              className="bg-[#1A1A1A] border border-[#2A2A2A] text-sm text-gray-300 rounded-xl px-3 py-2.5 outline-none">
              <option value="all">All Categories</option>
              {(Object.entries(CAT_CONFIG) as [DocCategory, any][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-[#1A1A1A] border border-[#2A2A2A] text-sm text-gray-300 rounded-xl px-3 py-2.5 outline-none">
              <option value="all">All Statuses</option>
              {(Object.entries(STATUS_CONFIG) as [ProcessingStatus, any][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
              className="bg-[#1A1A1A] border border-[#2A2A2A] text-sm text-gray-300 rounded-xl px-3 py-2.5 outline-none">
              <option value="date">Sort: Newest</option>
              <option value="name">Sort: Name</option>
              <option value="category">Sort: Category</option>
              <option value="size">Sort: Size</option>
            </select>

            <div className="flex gap-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-1">
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-white'}`}><List className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-white'}`}><Grid className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: 'Total Docs', value: docs.length, color: 'text-white' },
              { label: 'Approved', value: docs.filter(d => d.status === 'approved').length, color: 'text-green-400' },
              { label: 'Need Review', value: reviewCount, color: 'text-amber-400' },
              { label: 'Categories', value: new Set(docs.map(d => d.category)).size, color: 'text-violet-400' },
              { label: 'Total Size', value: formatBytes(docs.reduce((s, d) => s + d.fileSizeKB, 0)), color: 'text-blue-400' },
              { label: 'Missing', value: missingDocs.length, color: missingDocs.length > 0 ? 'text-red-400' : 'text-green-400' },
            ].map((s, i) => (
              <div key={i} className="bg-[#111] border border-[#2A2A2A] rounded-xl px-4 py-3 text-center">
                <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Document list / grid */}
          {filtered.length === 0 ? (
            <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-10 text-center">
              <FolderOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No documents match your filters</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl overflow-hidden divide-y divide-[#1f1f1f]">
              {filtered.map(doc => {
                const cat = CAT_CONFIG[doc.category];
                const stat = STATUS_CONFIG[doc.status];
                const FIcon = getFileIcon(doc.fileType);
                const CatIcon = cat.icon;
                const isProcessing = processing === doc.id;
                return (
                  <div key={doc.id}
                    className={`flex items-center gap-4 px-5 py-4 hover:bg-[#1A1A1A] transition cursor-pointer ${selected?.id === doc.id ? 'bg-[#1A1A1A]' : ''}`}
                    onClick={() => setSelected(doc)}>
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                      <CatIcon className={`w-4.5 h-4.5 ${cat.color}`} style={{ width: 18, height: 18 }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-white truncate">{doc.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500">{cat.label}</span>
                        <span className="text-xs text-gray-600">·</span>
                        <span className="text-xs text-gray-500">{formatDate(doc.uploadedAt)}</span>
                        <span className="text-xs text-gray-600">·</span>
                        <span className="text-xs text-gray-500">{formatBytes(doc.fileSizeKB)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {isProcessing && (
                        <span className="flex items-center gap-1.5 text-xs text-violet-400">
                          <Bot className="w-3.5 h-3.5 animate-pulse" /> AI processing…
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${stat.bg} ${stat.color}`}>{stat.label}</span>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(doc => {
                const cat = CAT_CONFIG[doc.category];
                const stat = STATUS_CONFIG[doc.status];
                const CatIcon = cat.icon;
                return (
                  <div key={doc.id}
                    onClick={() => setSelected(doc)}
                    className={`bg-[#111] border rounded-2xl p-4 cursor-pointer hover:border-violet-500/30 transition space-y-3 ${selected?.id === doc.id ? 'border-violet-500/50' : 'border-[#2A2A2A]'}`}>
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${cat.bg}`}>
                      <CatIcon className={`w-5 h-5 ${cat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white line-clamp-2 leading-snug">{doc.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{cat.label}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stat.bg} ${stat.color}`}>{stat.label}</span>
                      <span className="text-[10px] text-gray-600">{formatBytes(doc.fileSizeKB)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── TIMELINE ──────────────────────────────────────────────────────────── */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Showing {timeline.length} approved documents with document dates, ordered chronologically.</p>
          {timeline.length === 0 ? (
            <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-10 text-center">
              <Clock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No documents with dates yet</p>
              <p className="text-xs text-gray-600 mt-1">Approve documents and ensure they have document dates to build your property history.</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-px bg-[#2A2A2A]" />
              <div className="space-y-4">
                {timeline.map((doc, i) => {
                  const cat = CAT_CONFIG[doc.category];
                  const CatIcon = cat.icon;
                  const amount = doc.aiExtracted.find(f => f.key === 'amount')?.value;
                  const vendor = doc.aiExtracted.find(f => f.key === 'vendor' || f.key === 'inspector' || f.key === 'carrier' || f.key === 'tenant')?.value;
                  return (
                    <div key={doc.id} className="flex gap-5 pl-3 cursor-pointer" onClick={() => { setSelected(doc); setActiveTab('library'); }}>
                      <div className={`w-7 h-7 rounded-full border-2 border-[#0A0A0A] flex items-center justify-center flex-shrink-0 z-10 mt-1 ${cat.bg.replace('bg-', 'bg-').replace('/10', '/30')}`}>
                        <CatIcon className={`w-3.5 h-3.5 ${cat.color}`} />
                      </div>
                      <div className="flex-1 bg-[#111] border border-[#2A2A2A] hover:border-violet-500/30 rounded-xl p-4 transition">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-sm text-white">{doc.name}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-xs font-medium ${cat.color}`}>{cat.label}</span>
                              {vendor && <><span className="text-gray-600 text-xs">·</span><span className="text-xs text-gray-400">{vendor}</span></>}
                              {amount && <><span className="text-gray-600 text-xs">·</span><span className="text-xs text-green-400 font-bold">{amount}</span></>}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0 font-medium">
                            {new Date(doc.documentDate!).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MISSING DOCS ──────────────────────────────────────────────────────── */}
      {activeTab === 'missing' && (
        <div className="space-y-4">
          {missingDocs.length === 0 ? (
            <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-10 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-lg font-bold text-white">Document Library Complete</p>
              <p className="text-sm text-gray-400 mt-1">All recommended document types are on file. Great job keeping your records organized.</p>
            </div>
          ) : (
            <>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-400 mb-0.5">AI Document Audit — {missingDocs.length} recommended document{missingDocs.length !== 1 ? 's' : ''} missing</p>
                <p className="text-xs text-gray-400">Your property should have these documents on file for legal protection, insurance compliance, and resale readiness. Upload each to resolve.</p>
              </div>
              <div className="space-y-3">
                {missingDocs.map((m, i) => {
                  const cat = CAT_CONFIG[m.category];
                  const CatIcon = cat.icon;
                  return (
                    <div key={i} className="bg-[#111] border border-[#2A2A2A] rounded-xl p-5 flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                        <CatIcon className={`w-5 h-5 ${cat.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white">{m.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{cat.label}</p>
                        {m.nhNote && (
                          <p className="text-xs text-amber-400 mt-2 flex items-start gap-1.5">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {m.nhNote}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex-shrink-0 ${cat.bg} ${cat.color} hover:opacity-80`}>
                        Upload
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* What's already covered */}
          <div className="bg-[#111] border border-[#2A2A2A] rounded-xl p-5 space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Already On File</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {REQUIRED_DOC_TYPES.filter(r => !missingDocs.find(m => m.category === r.category)).map((r, i) => {
                const cat = CAT_CONFIG[r.category];
                return (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    {r.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL PANEL ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 flex justify-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <motion.div
              className="relative bg-[#111] border-l border-[#2A2A2A] w-full max-w-xl h-full overflow-y-auto z-10"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}>

              {/* Panel header */}
              <div className="sticky top-0 bg-[#111] border-b border-[#2A2A2A] px-6 py-4 z-10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{selected.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{CAT_CONFIG[selected.category].label} · {formatBytes(selected.fileSizeKB)} · {selected.fileType.toUpperCase()}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => deleteDoc(selected.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                    <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition"><X className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* Status + actions */}
                <div className="flex items-center gap-2 mt-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_CONFIG[selected.status].bg} ${STATUS_CONFIG[selected.status].color}`}>
                    {STATUS_CONFIG[selected.status].label}
                  </span>
                  {(selected.status === 'ready' || selected.status === 'review_needed') && (
                    <>
                      <button onClick={() => approveDoc(selected.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition">
                        <ThumbsUp className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => rejectDoc(selected.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition">
                        <ThumbsDown className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                  {selected.status === 'approved' && (
                    <button onClick={() => rejectDoc(selected.id)} className="text-xs text-gray-500 hover:text-red-400 transition">Revoke approval</button>
                  )}
                </div>
              </div>

              <div className="px-6 py-5 space-y-6">

                {/* AI extraction */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-violet-400" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">AI-Extracted Data</p>
                    <span className="text-[10px] text-gray-600">— review and edit each field</span>
                  </div>

                  {selected.aiExtracted.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No data extracted yet.</p>
                  ) : (
                    selected.aiExtracted.map(field => {
                      const isEditing = editingField === field.key;
                      const confColor = field.confidence >= 85 ? 'text-green-400' : field.confidence >= 70 ? 'text-amber-400' : 'text-red-400';
                      return (
                        <div key={field.key} className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-gray-400">{field.label}</p>
                            <div className="flex items-center gap-2">
                              {field.userEdited && <span className="text-[10px] text-blue-400 font-bold">EDITED</span>}
                              <span className={`text-[10px] font-bold ${confColor}`}>{field.confidence}% confidence</span>
                              <button onClick={() => { setEditingField(isEditing ? null : field.key); setFieldDraft(field.value); }}
                                className="p-1 rounded hover:bg-[#2A2A2A] text-gray-500 hover:text-white transition">
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          {isEditing ? (
                            <div className="flex gap-2">
                              <input value={fieldDraft} onChange={e => setFieldDraft(e.target.value)}
                                className="flex-1 bg-[#111] border border-violet-500 rounded-lg px-3 py-2 text-sm text-white outline-none" />
                              <button onClick={() => saveField(selected.id, field.key, fieldDraft)}
                                className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition">
                                <Save className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm text-white font-medium">{field.value}</p>
                          )}
                          {field.confidence < 75 && (
                            <p className="text-[10px] text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Low confidence — please verify this value
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.tags.map((tag, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-xs text-gray-400">{tag}</span>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Notes</p>
                  <textarea
                    value={selected.userNotes}
                    onChange={e => {
                      const updated = { ...selected, userNotes: e.target.value };
                      setSelected(updated);
                      setDocs(prev => prev.map(d => d.id === selected.id ? updated : d));
                    }}
                    rows={3}
                    placeholder="Add notes about this document…"
                    className="w-full bg-[#0d0d0d] border border-[#2A2A2A] focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-white outline-none resize-none transition"
                  />
                </div>

                {/* Metadata */}
                <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Document Info</p>
                  {[
                    { label: 'Uploaded', value: formatDate(selected.uploadedAt) },
                    { label: 'Document Date', value: selected.documentDate ? formatDate(selected.documentDate) : 'Not detected' },
                    { label: 'File Type', value: selected.fileType.toUpperCase() },
                    { label: 'File Size', value: formatBytes(selected.fileSizeKB) },
                    { label: 'Category', value: CAT_CONFIG[selected.category].label },
                    { label: 'System', value: selected.propertySystem || '—' },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{row.label}</span>
                      <span className="text-gray-300 font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
