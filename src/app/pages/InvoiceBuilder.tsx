import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Send, Download, Copy, Check, FileText, DollarSign, Clock, ChevronDown, Eye, ArrowLeft, Zap, CheckCircle, UserPlus, X, Search, User, PenTool, Package } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import companyLogo from '../../imports/BPB_phoenix_full_color_logo.png';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { fetchAccountContacts, type CrmContact } from '../utils/crmContactsApi';
import { materialsHubService, type Material } from '../lib/services/materialsHubService';
import { generateDemoQuote } from '../lib/demoQuoteGenerator';
import * as CompanyStore from '../lib/simpleCompanyStore';
import { pickMainAppCompany, setActiveCompanyInfoFromStore } from '../lib/config/companyInfo';
import { DEFAULT_TECH_TIERS } from '../components/TierPicker';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface LineItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
}

interface SubQuote {
  id: string;
  subName: string;        // subcontractor / vendor name
  description: string;    // scope of work they quoted
  baseAmount: number;     // what THEY quoted us (raw, unmarked)
  markupPct: number;      // our markup on top
  total: number;          // baseAmount * (1 + markupPct/100)
  createdAt: string;
}

interface Invoice {
  id: string;
  type: 'invoice' | 'estimate';
  number: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  customerId?: string;
  issueDate: string;
  dueDate: string;
  items: LineItem[];
  subQuotes?: SubQuote[];   // subcontractor quotes we've folded into this quote (saved on our side)
  floorPlanData?: any;      // Design Studio floor plan attached to this quote
  designMaterials?: any[];  // materials extracted by Design Studio from the design
  notes: string;
  taxRate: number;
  status: 'draft' | 'sent' | 'viewed' | 'paid';
  createdAt: string;
}

const BLANK_ITEM = (): LineItem => ({ id: crypto.randomUUID(), description: '', qty: 1, rate: 0 });

const PRESET_ITEMS = [
  { description: 'Labor (per hour)', qty: 2, rate: 75 },
  { description: 'Materials & Supplies', qty: 1, rate: 150 },
  { description: 'Consultation / Site Visit', qty: 1, rate: 50 },
  { description: 'Debris Removal & Cleanup', qty: 1, rate: 120 },
  { description: 'Painting — Interior (per room)', qty: 1, rate: 350 },
  { description: 'Lawn Mowing & Trimming', qty: 1, rate: 120 },
  { description: 'Power Washing', qty: 1, rate: 180 },
  { description: 'Delivery & Hauling', qty: 1, rate: 99 },
];

const STATUS_CONFIG = {
  draft:  { label: 'Draft',  color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  sent:   { label: 'Sent',   color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  viewed: { label: 'Viewed', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  paid:   { label: 'Paid',   color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
};

function newInvoiceNumber(type: 'invoice' | 'estimate') {
  const prefix = type === 'invoice' ? 'INV' : 'EST';
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

function today() { return new Date().toISOString().split('T')[0]; }
function inDays(n: number) { return new Date(Date.now() + n * 86400000).toISOString().split('T')[0]; }

const DEMO_INVOICES: Invoice[] = [
  {
    id: 'inv1', type: 'invoice', number: 'INV-001234', clientName: 'Marcus Thompson', clientEmail: 'marcus@email.com',
    clientPhone: '(555) 210-4490', clientAddress: '123 Oak St, Columbus, OH',
    issueDate: '2026-07-01', dueDate: '2026-07-15',
    items: [
      { id: 'i1', description: 'Bathroom Renovation — Labor', qty: 16, rate: 75 },
      { id: 'i2', description: 'Materials & Tile', qty: 1, rate: 420 },
      { id: 'i3', description: 'Debris Removal', qty: 1, rate: 120 },
    ],
    notes: 'Thank you for your business! Payment due within 14 days. Accepts Zelle, Venmo, or check.',
    taxRate: 7.5, status: 'paid', createdAt: '2026-07-01',
  },
  {
    id: 'inv2', type: 'estimate', number: 'EST-005678', clientName: 'Sarah K.', clientEmail: 'sarah@email.com',
    clientPhone: '(555) 384-1122', clientAddress: '456 Maple Ave, Dublin, OH',
    issueDate: today(), dueDate: inDays(30),
    items: [
      { id: 'i4', description: 'Lawn Mowing & Trimming (bi-weekly)', qty: 4, rate: 120 },
      { id: 'i5', description: 'Spring Cleanup & Mulching', qty: 1, rate: 280 },
    ],
    notes: 'This estimate is valid for 30 days. We can start as early as next week!',
    taxRate: 0, status: 'sent', createdAt: today(),
  },
];

type View = 'list' | 'edit' | 'preview';

export default function InvoiceBuilder({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>(DEMO_INVOICES);
  const [view, setView] = useState<View>('list');
  const [current, setCurrent] = useState<Invoice | null>(null);
  const [sending, setSending] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unassigned'>('all');

  // Customer picker (assign-a-customer-to-this-quote-later)
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [contactSearch, setContactSearch] = useState('');

  // Materials picker (pulls from the real Materials Hub catalog)
  const [showMaterialsPicker, setShowMaterialsPicker] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialSearch, setMaterialSearch] = useState('');

  // Labor picker (pulls from tech tier rates)
  const [showLaborPicker, setShowLaborPicker] = useState(false);
  const [laborTiers, setLaborTiers] = useState<{ id: string; label: string; hourlyRate: number }[]>([]);

  // Subcontractor quote (fold their quote in with a markup, keep the original on our side)
  const [showSubQuote, setShowSubQuote] = useState(false);
  const [subName, setSubName] = useState('');
  const [subDescription, setSubDescription] = useState('');
  const [subAmount, setSubAmount] = useState(0);
  const [subMarkup, setSubMarkup] = useState(20);

  // Auto-generate quote
  const [showGenerator, setShowGenerator] = useState(false);
  const [genServiceType, setGenServiceType] = useState('Kitchen Remodel');
  const [genValue, setGenValue] = useState(10000);
  const [pushingPipeline, setPushingPipeline] = useState(false);

  // Plans & renderings attached to the open quote (from Design Studio)
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [buildingPackage, setBuildingPackage] = useState(false);
  const [loadingDeliverables, setLoadingDeliverables] = useState(false);

  // Shared canonical fallback — the live source of truth is the server config,
  // fetched in openLaborPicker(). This only applies if that request fails.
  const DEFAULT_LABOR_TIERS = DEFAULT_TECH_TIERS;

  // Quotes/invoices here always represent the main app business (Black Phoenix
  // Builds), never the ecommerce store — resolve and apply it on mount.
  useEffect(() => {
    (async () => {
      try {
        const companies = await CompanyStore.getAllCompanies(user?.id);
        const mainApp = pickMainAppCompany(companies);
        if (mainApp) setActiveCompanyInfoFromStore(mainApp);
      } catch (err) {
        console.error('[InvoiceBuilder] Could not resolve main-app company:', err);
      }
    })();
  }, []);

  // ── Load quotes from the server on mount ────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${SERVER}/quotes`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        if (!res.ok) throw new Error(`GET /quotes failed with ${res.status}`);
        const data = await res.json();
        const serverQuotes: Invoice[] = Array.isArray(data?.quotes) ? data.quotes : [];
        if (!alive) return;
        // Show server quotes if any exist; otherwise seed the demo docs so the
        // page isn't empty for a brand-new account.
        if (serverQuotes.length > 0) {
          serverQuotes.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setInvoices(serverQuotes);
        }
        // If another feature (e.g. the Change Order Camera AI) handed off a quote,
        // open it straight into the editor.
        try {
          const openId = localStorage.getItem('invoice_open_id');
          if (openId) {
            localStorage.removeItem('invoice_open_id');
            const match = serverQuotes.find(q => q.id === openId);
            if (match) {
              setCurrent({ ...match });
              setView('edit');
              loadDeliverables(match.id);
              toast.success('Opened the quote — plans & renderings loaded.');
            }
          }
        } catch { /* ignore */ }
      } catch (err) {
        console.error('[InvoiceBuilder] Error loading quotes from server:', err);
        toast.error('Could not load saved documents — showing local copy.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ── Load CRM contacts for the customer picker (lazy, on first open) ──────────
  async function loadContacts() {
    try {
      const account = await fetchAccountContacts();
      // Also fold in any locally-managed CRM contacts.
      let local: CrmContact[] = [];
      try {
        const raw = localStorage.getItem('crm_contacts');
        if (raw) local = JSON.parse(raw);
      } catch { /* ignore */ }
      const byKey = new Map<string, CrmContact>();
      for (const c of [...account, ...local]) {
        const key = ((c.email || c.id) as string).toLowerCase();
        if (!byKey.has(key)) byKey.set(key, c);
      }
      setContacts(Array.from(byKey.values()));
    } catch (err) {
      console.error('[InvoiceBuilder] Error loading CRM contacts:', err);
      toast.error('Could not load customers.');
    }
  }

  function openCustomerPicker() {
    setShowCustomerPicker(true);
    if (contacts.length === 0) loadContacts();
  }

  // Persist a doc to the server (fire-and-forget with error surfacing).
  async function persist(doc: Invoice) {
    try {
      const res = await fetch(`${SERVER}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ quote: doc }),
      });
      if (!res.ok) throw new Error(`POST /quotes failed with ${res.status}`);
    } catch (err) {
      console.error('[InvoiceBuilder] Error persisting quote:', err);
      toast.error('Saved locally, but failed to sync to server.');
    }
  }

  // Attach (or reassign) a CRM customer to the doc currently being edited.
  function assignCustomer(contact: CrmContact) {
    setCurrent(prev => {
      if (!prev) return prev;
      const updated: Invoice = {
        ...prev,
        customerId: contact.id,
        clientName: contact.name || prev.clientName,
        clientEmail: contact.email || prev.clientEmail,
        clientPhone: contact.phone || prev.clientPhone,
        clientAddress: contact.location || prev.clientAddress,
      };
      setInvoices(list => list.map(i => i.id === updated.id ? updated : i));
      persist(updated);
      return updated;
    });
    setShowCustomerPicker(false);
    toast.success(`Assigned to ${contact.name || contact.email}`);
  }

  function unassignCustomer() {
    setCurrent(prev => {
      if (!prev) return prev;
      const updated: Invoice = { ...prev, customerId: '', clientName: '', clientEmail: '', clientPhone: '', clientAddress: '' };
      setInvoices(list => list.map(i => i.id === updated.id ? updated : i));
      persist(updated);
      return updated;
    });
    toast.success('Customer removed — quote is now unassigned.');
  }

  // ── Materials picker ────────────────────────────────────────────────────────
  function openMaterialsPicker() {
    setShowMaterialsPicker(true);
    if (materials.length === 0) {
      try {
        setMaterials(materialsHubService.getAllMaterials());
      } catch (err) {
        console.error('[InvoiceBuilder] Error loading materials:', err);
        toast.error('Could not load materials catalog.');
      }
    }
  }

  function addMaterialLine(m: Material) {
    setCurrent(prev => prev ? {
      ...prev,
      items: [...prev.items, {
        id: crypto.randomUUID(),
        description: m.unit ? `${m.name} (${m.unit})` : m.name,
        qty: 1,
        rate: m.basePrice || 0,
      }],
    } : prev);
    toast.success(`Added ${m.name}`);
  }

  // ── Subcontractor quote ─────────────────────────────────────────────────────
  function openSubQuote() {
    setSubName('');
    setSubDescription('');
    setSubAmount(0);
    setSubMarkup(20);
    setShowSubQuote(true);
  }

  function addSubQuote() {
    if (!current) return;
    if (!subName.trim() || subAmount <= 0) {
      toast.error('Enter a subcontractor name and a quoted amount.');
      return;
    }
    const markup = Number(subMarkup) || 0;
    const total = Math.round(subAmount * (1 + markup / 100) * 100) / 100;
    const sub: SubQuote = {
      id: crypto.randomUUID(),
      subName: subName.trim(),
      description: subDescription.trim(),
      baseAmount: subAmount,
      markupPct: markup,
      total,
      createdAt: new Date().toISOString(),
    };
    // Add ONE marked-up line item the customer sees…
    const lineDescription = `${subName.trim()}${subDescription.trim() ? ` — ${subDescription.trim()}` : ''} (subcontracted, incl. ${markup}% markup)`;
    const updated: Invoice = {
      ...current,
      items: [...current.items, {
        id: crypto.randomUUID(),
        description: lineDescription,
        qty: 1,
        rate: total,
      }],
      // …and keep the ORIGINAL subcontractor quote on our side.
      subQuotes: [...(current.subQuotes || []), sub],
    };
    setCurrent(updated);
    persist(updated);
    setShowSubQuote(false);
    toast.success(`Added ${subName.trim()}'s quote ($${subAmount.toFixed(2)} + ${markup}% = $${total.toFixed(2)})`);
  }

  function removeSubQuote(id: string) {
    setCurrent(prev => prev ? { ...prev, subQuotes: (prev.subQuotes || []).filter(s => s.id !== id) } : prev);
  }

  // ── Labor picker ────────────────────────────────────────────────────────────
  async function openLaborPicker() {
    setShowLaborPicker(true);
    if (laborTiers.length === 0) {
      try {
        const res = await fetch(`${SERVER}/tech-tiers/config`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          const tiers = Array.isArray(data?.tiers) ? data.tiers : [];
          setLaborTiers(tiers.length > 0 ? tiers : DEFAULT_LABOR_TIERS);
        } else {
          setLaborTiers(DEFAULT_LABOR_TIERS);
        }
      } catch (err) {
        console.error('[InvoiceBuilder] Error loading labor tiers:', err);
        setLaborTiers(DEFAULT_LABOR_TIERS);
      }
    }
  }

  function addLaborLine(tier: { id: string; label: string; hourlyRate: number }) {
    setCurrent(prev => prev ? {
      ...prev,
      items: [...prev.items, {
        id: crypto.randomUUID(),
        description: `Labor — ${tier.label} (per hour)`,
        qty: 1,
        rate: tier.hourlyRate || 0,
      }],
    } : prev);
    setShowLaborPicker(false);
    toast.success(`Added ${tier.label} labor`);
  }

  // ── Auto-generate quote (materials + labor by project type) ──────────────────
  function runAutoGenerate() {
    if (!current) return;
    try {
      const quote = generateDemoQuote({
        id: current.id,
        title: genServiceType,
        description: `${genServiceType} — auto-generated estimate`,
        serviceType: genServiceType,
        estimatedValue: Number(genValue) || 0,
      });
      const materialLines: LineItem[] = (quote.materials || []).map((m: any) => ({
        id: crypto.randomUUID(),
        description: `${m.name}${m.unit ? ` (${m.unit})` : ''}`,
        qty: Number(m.quantity) || 1,
        rate: Number(m.unitCost) || 0,
      }));
      const laborLines: LineItem[] = (quote.labor || []).map((l: any) => ({
        id: crypto.randomUUID(),
        description: `Labor — ${l.role}`,
        qty: Number(l.hours) || 1,
        rate: Number(l.hourlyRate) || 0,
      }));
      setCurrent(prev => prev ? {
        ...prev,
        items: [...materialLines, ...laborLines],
        // Generator uses a 0.08 fraction; our builder stores tax as a percent.
        taxRate: Math.round((quote.taxRate || 0.08) * 100),
      } : prev);
      setShowGenerator(false);
      toast.success(`Generated ${materialLines.length} materials + ${laborLines.length} labor lines`);
    } catch (err) {
      console.error('[InvoiceBuilder] Auto-generate failed:', err);
      toast.error('Could not auto-generate quote.');
    }
  }

  // ── Push to pipeline ────────────────────────────────────────────────────────
  async function pushToPipeline() {
    if (!current) return;
    save();
    setPushingPipeline(true);
    try {
      const materialsList = current.items.map(i => ({
        id: i.id, name: i.description, quantity: i.qty, unit: '', unitCost: i.rate,
        totalCost: i.qty * i.rate, category: 'Quote Line', visible: true,
      }));
      const pipelineItem = {
        id: `PIPE-${current.id}`,
        itemNumber: current.number,
        stage: 'quote-draft',
        customerName: current.clientName || 'Unassigned',
        customerEmail: current.clientEmail || '',
        customerPhone: current.clientPhone || '',
        location: current.clientAddress || '',
        serviceType: 'Estimate',
        title: `${current.number} — ${current.clientName || 'Unassigned'}`,
        description: current.notes || '',
        estimatedValue: grandTotal,
        priority: 'medium',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        customerId: current.customerId || '',
        quote: {
          id: current.id,
          quoteNumber: current.number,
          materials: materialsList,
          labor: [],
          processSteps: [],
          materialsSubtotal: subtotal,
          laborSubtotal: 0,
          taxRate: current.taxRate / 100,
          taxAmount: tax,
          totalCost: grandTotal,
          generatedAt: new Date().toISOString(),
          approvalStatus: 'pending',
        },
      };
      const res = await fetch(`${SERVER}/pipeline/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify(pipelineItem),
      });
      if (!res.ok) throw new Error(`POST /pipeline/items failed with ${res.status}`);
      toast.success('Sent to pipeline as a quote-draft opportunity!');
    } catch (err) {
      console.error('[InvoiceBuilder] Error pushing to pipeline:', err);
      toast.error('Failed to push to pipeline.');
    } finally {
      setPushingPipeline(false);
    }
  }

  // ── Open this quote in Design Studio (layouts / plans / renderings) ──────────
  function openInDesignStudio() {
    if (!current) return;
    save(); // persist first so Design Studio's PUT merges onto a saved doc
    const designQuote = {
      quoteId: current.id,
      quoteNumber: current.number,
      projectTitle: current.clientName || current.number,
      customerId: current.customerId || '',
      customerName: current.clientName || '',
      status: current.status,
      total: grandTotal,
      // Feed our line items in as the starting material list.
      materials: current.items.map(i => ({
        name: i.description,
        quantity: i.qty,
        unitCost: i.rate,
        totalCost: i.qty * i.rate,
      })),
      labor: [],
      floorPlanData: current.floorPlanData || null,
    };
    // Persist the id + quote payload so the builder re-opens this quote when the
    // Design Center returns, and so the Design Center can pick up the project.
    try {
      localStorage.setItem('invoice_open_id', current.id);
      localStorage.setItem('design_center_quote', JSON.stringify(designQuote));
    } catch { /* ignore */ }
    if (onNavigate) {
      onNavigate('design');
    } else {
      toast.error('Navigation is unavailable here.');
    }
  }

  // Import Design Studio's extracted materials as line items (non-destructive).
  function importDesignMaterials() {
    if (!current?.designMaterials?.length) return;
    const newItems: LineItem[] = current.designMaterials.map((m: any) => ({
      id: crypto.randomUUID(),
      description: `${m.name}${m.unit ? ` (${m.unit})` : ''}`,
      qty: Number(m.quantity) || 1,
      rate: Number(m.unitCost) || 0,
    }));
    const updated: Invoice = { ...current, items: [...current.items, ...newItems] };
    setCurrent(updated);
    persist(updated);
    toast.success(`Imported ${newItems.length} materials from Design Studio.`);
  }

  function newDoc(type: 'invoice' | 'estimate') {
    const doc: Invoice = {
      id: crypto.randomUUID(),
      type, number: newInvoiceNumber(type),
      clientName: '', clientEmail: '', clientPhone: '', clientAddress: '',
      issueDate: today(), dueDate: inDays(type === 'invoice' ? 14 : 30),
      items: [BLANK_ITEM()],
      notes: type === 'invoice'
        ? 'Thank you for your business! Payment accepted via Zelle, Venmo, cash, or check.'
        : 'This estimate is valid for 30 days. Contact us to get started!',
      taxRate: 0, status: 'draft', createdAt: today(),
    };
    setCurrent(doc);
    setView('edit');
  }

  function setField(key: keyof Invoice, val: any) {
    setCurrent(prev => prev ? { ...prev, [key]: val } : prev);
  }

  function setItem(id: string, key: keyof LineItem, val: any) {
    setCurrent(prev => prev ? { ...prev, items: prev.items.map(i => i.id === id ? { ...i, [key]: val } : i) } : prev);
  }

  function addItem() {
    setCurrent(prev => prev ? { ...prev, items: [...prev.items, BLANK_ITEM()] } : prev);
  }

  function addPreset(preset: typeof PRESET_ITEMS[0]) {
    setCurrent(prev => prev ? { ...prev, items: [...prev.items, { ...BLANK_ITEM(), ...preset }] } : prev);
    setShowPresets(false);
  }

  function removeItem(id: string) {
    setCurrent(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== id) } : prev);
  }

  function save() {
    if (!current) return;
    setInvoices(prev => {
      const exists = prev.find(i => i.id === current.id);
      return exists ? prev.map(i => i.id === current.id ? current : i) : [current, ...prev];
    });
    persist(current);
    toast.success(`${current.type === 'invoice' ? 'Invoice' : 'Estimate'} saved!`);
  }

  async function sendDoc() {
    if (!current?.clientEmail) { toast.error('Add client email first'); return; }
    save();
    setSending(true);
    try {
      await fetch(`${SERVER}/leads/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          email: current.clientEmail, name: current.clientName,
          phone: current.clientPhone, source: `${current.type}_sent`,
          notes: `${current.type.toUpperCase()} ${current.number} — Total: $${grandTotal.toFixed(2)}`,
        }),
      });
    } catch (_) {}
    await new Promise(r => setTimeout(r, 1000));
    setField('status', 'sent');
    setInvoices(prev => prev.map(i => i.id === current!.id ? { ...current!, status: 'sent' } : i));
    setSending(false);
    toast.success(`${current.type === 'invoice' ? 'Invoice' : 'Estimate'} sent to ${current.clientEmail}!`);
  }

  function markPaid() {
    if (!current) return;
    const updated = { ...current, status: 'paid' as const };
    setCurrent(updated);
    setInvoices(prev => prev.map(i => i.id === current.id ? updated : i));
    toast.success('Marked as paid! 🎉');
  }

  function openEdit(inv: Invoice) { setCurrent({ ...inv }); setView('edit'); loadDeliverables(inv.id); }

  // Fetch the plans/renderings attached to a quote (with fresh signed URLs).
  async function loadDeliverables(quoteId: string) {
    setDeliverables([]);
    setLoadingDeliverables(true);
    try {
      const res = await fetch(`${SERVER}/quotes/${quoteId}/deliverables`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDeliverables(Array.isArray(data?.deliverables) ? data.deliverables : []);
      }
    } catch (err) {
      console.error('[InvoiceBuilder] Error loading deliverables:', err);
    } finally {
      setLoadingDeliverables(false);
    }
  }

  async function deleteDeliverable(did: string) {
    if (!current) return;
    try {
      const res = await fetch(`${SERVER}/quotes/${current.id}/deliverables/${did}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      if (!res.ok) throw new Error(`DELETE failed with ${res.status}`);
      setDeliverables(prev => prev.filter(d => d.id !== did));
      toast.success('Deliverable removed.');
    } catch (err) {
      console.error('[InvoiceBuilder] Error deleting deliverable:', err);
      toast.error('Could not remove deliverable.');
    }
  }

  // ── Build Package: bundle quote + plans + renderings into one printable doc ──
  // Opens a formatted window the user can save/share as a single PDF (or print).
  async function buildPackage() {
    if (!current) return;
    setBuildingPackage(true);
    try {
      save();
      // Refresh deliverables so we embed fresh signed URLs for the images.
      let dels = deliverables;
      try {
        const res = await fetch(`${SERVER}/quotes/${current.id}/deliverables`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          dels = Array.isArray(data?.deliverables) ? data.deliverables : dels;
          setDeliverables(dels);
        }
      } catch { /* fall back to whatever we already have */ }

      const win = window.open('', '_blank');
      if (!win) {
        toast.error('Allow pop-ups to build the package.');
        return;
      }
      const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
      const money = (n: number) => `$${n.toFixed(2)}`;
      const rows = current.items.map(i => `
        <tr>
          <td>${esc(i.description)}</td>
          <td style="text-align:right">${i.qty}</td>
          <td style="text-align:right">${money(i.rate)}</td>
          <td style="text-align:right">${money(i.qty * i.rate)}</td>
        </tr>`).join('');
      const media = dels.filter(d => d.signedUrl).map(d => `
        <figure class="media">
          <img src="${esc(d.signedUrl)}" alt="${esc(d.name)}" />
          <figcaption>${esc(d.name)} <span class="kind">${esc(d.kind)}</span></figcaption>
        </figure>`).join('');
      const subs = (current.subQuotes || []).map(s => `
        <li>${esc(s.subName)} — ${esc(s.description)} (base ${money(s.baseAmount)} + ${s.markupPct}% → ${money(s.total)})</li>`).join('');

      win.document.write(`<!doctype html><html><head><meta charset="utf-8"/>
        <title>${esc(current.type.toUpperCase())} ${esc(current.number)} — Package</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#111; margin:0; padding:40px; }
          h1 { margin:0 0 4px; font-size:24px; }
          h2 { font-size:15px; text-transform:uppercase; letter-spacing:1px; color:#666; border-bottom:2px solid #ea580c; padding-bottom:6px; margin:32px 0 12px; }
          .head { display:flex; justify-content:space-between; align-items:flex-start; }
          .brand { color:#ea580c; font-weight:800; font-size:13px; letter-spacing:1px; }
          .meta { text-align:right; font-size:13px; color:#444; }
          table { width:100%; border-collapse:collapse; font-size:13px; }
          th { text-align:left; border-bottom:1px solid #ddd; padding:8px 6px; color:#666; font-size:11px; text-transform:uppercase; }
          td { padding:8px 6px; border-bottom:1px solid #f0f0f0; }
          .totals { margin-top:12px; width:280px; margin-left:auto; font-size:13px; }
          .totals div { display:flex; justify-content:space-between; padding:4px 0; }
          .totals .grand { font-weight:800; font-size:16px; color:#ea580c; border-top:2px solid #111; margin-top:6px; padding-top:8px; }
          .gallery { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
          .media img { width:100%; border:1px solid #ddd; border-radius:8px; }
          .media figcaption { font-size:12px; color:#444; margin-top:4px; }
          .kind { background:#f0f0f0; border-radius:4px; padding:1px 6px; font-size:10px; text-transform:uppercase; color:#888; margin-left:4px; }
          .notes { font-size:13px; white-space:pre-wrap; color:#333; }
          ul { font-size:13px; color:#333; }
          @media print { body { padding:0.5in; } h2 { page-break-after:avoid; } .media { page-break-inside:avoid; } }
        </style></head><body>
        <div class="head">
          <div>
            <div class="brand">THE BLACK PHOENIX COMPANY</div>
            <h1>${esc(current.type === 'invoice' ? 'Invoice' : 'Estimate')} ${esc(current.number)}</h1>
            <div style="font-size:13px;color:#444">${esc(current.clientName || 'Unassigned')}</div>
            ${current.clientAddress ? `<div style="font-size:12px;color:#666">${esc(current.clientAddress)}</div>` : ''}
            ${current.clientEmail ? `<div style="font-size:12px;color:#666">${esc(current.clientEmail)}</div>` : ''}
          </div>
          <div class="meta">
            <div>Issued: ${esc(current.issueDate || '—')}</div>
            ${current.dueDate ? `<div>Due: ${esc(current.dueDate)}</div>` : ''}
            <div>Status: ${esc(current.status)}</div>
          </div>
        </div>

        <h2>Scope &amp; Line Items</h2>
        <table>
          <thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4" style="color:#999">No line items</td></tr>'}</tbody>
        </table>
        <div class="totals">
          <div><span>Subtotal</span><span>${money(subtotal)}</span></div>
          <div><span>Tax (${current.taxRate}%)</span><span>${money(tax)}</span></div>
          <div class="grand"><span>Total</span><span>${money(grandTotal)}</span></div>
        </div>

        ${current.notes ? `<h2>Notes</h2><div class="notes">${esc(current.notes)}</div>` : ''}
        ${subs ? `<h2>Subcontractor Quotes (internal record)</h2><ul>${subs}</ul>` : ''}
        ${media ? `<h2>Plans &amp; Renderings</h2><div class="gallery">${media}</div>` : ''}

        <script>
          // Wait for images to load so the print output includes them.
          const imgs = Array.from(document.images);
          let left = imgs.length;
          if (left === 0) { window.focus(); setTimeout(() => window.print(), 300); }
          else imgs.forEach(im => {
            const done = () => { if (--left <= 0) { window.focus(); setTimeout(() => window.print(), 300); } };
            im.complete ? done() : (im.onload = done, im.onerror = done);
          });
        </script>
        </body></html>`);
      win.document.close();
      // Also drop the structured takeoff JSON alongside the printable PDF.
      exportJson(dels);
      toast.success('Package ready — PDF print dialog opened + takeoff JSON downloaded.');
    } catch (err) {
      console.error('[InvoiceBuilder] Error building package:', err);
      toast.error('Could not build the package.');
    } finally {
      setBuildingPackage(false);
    }
  }

  // ── Export structured takeoff data as JSON (for crews / estimating tools) ────
  function exportJson(delsOverride?: any[]) {
    if (!current) return;
    const dels = delsOverride ?? deliverables;
    const sub = current.items.reduce((s, i) => s + i.qty * i.rate, 0);
    const t = sub * ((current.taxRate || 0) / 100);
    const payload = {
      exportedAt: new Date().toISOString(),
      type: current.type,
      number: current.number,
      status: current.status,
      client: {
        id: current.customerId || '',
        name: current.clientName || '',
        email: current.clientEmail || '',
        phone: current.clientPhone || '',
        address: current.clientAddress || '',
      },
      issueDate: current.issueDate,
      dueDate: current.dueDate,
      lineItems: current.items.map(i => ({
        description: i.description,
        quantity: i.qty,
        rate: i.rate,
        amount: i.qty * i.rate,
      })),
      subcontractorQuotes: (current.subQuotes || []).map(s => ({
        subName: s.subName,
        description: s.description,
        baseAmount: s.baseAmount,
        markupPct: s.markupPct,
        total: s.total,
        createdAt: s.createdAt,
      })),
      designMaterials: current.designMaterials || [],
      deliverables: dels.map(d => ({ id: d.id, name: d.name, kind: d.kind, url: d.signedUrl || '' })),
      floorPlanData: current.floorPlanData || null,
      totals: { subtotal: sub, taxRate: current.taxRate, tax: t, grandTotal: sub + t },
      notes: current.notes || '',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${current.number || current.id}-takeoff.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Takeoff data exported as JSON.');
  }

  const subtotal = current?.items.reduce((s, i) => s + i.qty * i.rate, 0) ?? 0;
  const tax = subtotal * ((current?.taxRate ?? 0) / 100);
  const grandTotal = subtotal + tax;

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, inv) => {
    const sub = inv.items.reduce((a, item) => a + item.qty * item.rate, 0);
    return s + sub + sub * (inv.taxRate / 100);
  }, 0);
  const outstanding = invoices.filter(i => i.status === 'sent' || i.status === 'viewed').reduce((s, inv) => {
    const sub = inv.items.reduce((a, item) => a + item.qty * item.rate, 0);
    return s + sub + sub * (inv.taxRate / 100);
  }, 0);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 sm:p-6 space-y-5">

      {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-400" /> Invoices & Estimates
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">Create, send, and track professional documents</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => newDoc('estimate')}
                className="px-3 py-2 rounded-xl text-xs font-black transition hover:brightness-110"
                style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }}>
                + Estimate
              </button>
              <button onClick={() => newDoc('invoice')}
                className="px-3 py-2 rounded-xl text-xs font-black text-white transition hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
                + Invoice
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Collected', value: `$${totalRevenue.toFixed(0)}`, icon: DollarSign, color: '#22c55e' },
              { label: 'Outstanding', value: `$${outstanding.toFixed(0)}`, icon: Clock, color: '#f59e0b' },
              { label: 'Total Docs', value: invoices.length, icon: FileText, color: '#3b82f6' },
              { label: 'Paid', value: invoices.filter(i => i.status === 'paid').length, icon: CheckCircle, color: '#ea580c' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: s.color + '18' }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filter chips */}
          <div className="flex gap-2">
            {([
              { key: 'all', label: `All (${invoices.length})` },
              { key: 'unassigned', label: `Unassigned (${invoices.filter(i => !i.customerId).length})` },
            ] as const).map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                style={filter === f.key
                  ? { background: '#ea580c', color: '#fff' }
                  : { background: '#1a1a1a', color: '#9ca3af', border: '1px solid #2a2a2a' }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Document list */}
          <div className="space-y-2">
            {invoices.filter(inv => filter === 'all' || !inv.customerId).map(inv => {
              const sub = inv.items.reduce((a, i) => a + i.qty * i.rate, 0);
              const total = sub + sub * (inv.taxRate / 100);
              const sc = STATUS_CONFIG[inv.status];
              return (
                <button key={inv.id} onClick={() => openEdit(inv)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl text-left transition hover:brightness-110"
                  style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: inv.type === 'invoice' ? 'rgba(234,88,12,0.15)' : 'rgba(168,85,247,0.15)' }}>
                      <FileText className="w-5 h-5" style={{ color: inv.type === 'invoice' ? '#ea580c' : '#a855f7' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-white">{inv.number}</p>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                        {!inv.customerId && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Unassigned</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{inv.clientName || 'No customer yet'} · {inv.issueDate}</p>
                    </div>
                  </div>
                  <p className="text-base font-black" style={{ color: inv.status === 'paid' ? '#22c55e' : '#ea580c' }}>
                    ${total.toFixed(2)}
                  </p>
                </button>
              );
            })}
            {invoices.length === 0 && (
              <div className="text-center py-16 text-gray-600">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No documents yet — create your first invoice or estimate!</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── EDIT VIEW ─────────────────────────────────────────────────────── */}
      {view === 'edit' && current && (
        <div className="space-y-5 max-w-2xl">
          <div className="flex items-center justify-between">
            <button onClick={() => { save(); setView('list'); }} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div className="flex gap-2">
              <button onClick={() => setView('preview')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition"
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#9ca3af' }}>
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
              <button onClick={save}
                className="px-3 py-2 rounded-xl text-xs font-black text-white transition hover:brightness-110"
                style={{ background: '#2a2a2a' }}>
                Save
              </button>
              <button onClick={openInDesignStudio}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition hover:brightness-110"
                style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', color: '#60a5fa' }}>
                <PenTool className="w-3.5 h-3.5" /> Design Center
              </button>
              <button onClick={pushToPipeline} disabled={pushingPipeline}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition hover:brightness-110 disabled:opacity-50"
                style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: '#c084fc' }}>
                <Zap className="w-3.5 h-3.5" /> {pushingPipeline ? 'Sending…' : '→ Pipeline'}
              </button>
              <button onClick={buildPackage} disabled={buildingPackage}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition hover:brightness-110 disabled:opacity-50"
                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80' }}>
                <Package className="w-3.5 h-3.5" /> {buildingPackage ? 'Building…' : 'Build Package'}
              </button>
              <button onClick={exportJson}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition hover:brightness-110"
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#9ca3af' }}>
                <Download className="w-3.5 h-3.5" /> Data (JSON)
              </button>
              <button onClick={sendDoc} disabled={sending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-white transition hover:brightness-110 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
                <Send className="w-3.5 h-3.5" /> {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>

          {/* Type + number */}
          <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {(['invoice', 'estimate'] as const).map(t => (
                  <button key={t} onClick={() => setField('type', t)}
                    className="px-4 py-2 rounded-xl text-xs font-black capitalize transition"
                    style={current.type === t
                      ? { background: t === 'invoice' ? '#ea580c' : '#a855f7', color: '#fff' }
                      : { background: '#1a1a1a', color: '#6b7280', border: '1px solid #2a2a2a' }}>
                    {t}
                  </button>
                ))}
              </div>
              <p className="text-xs font-mono text-gray-500">{current.number}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1 block">Issue Date</label>
                <input type="date" value={current.issueDate} onChange={e => setField('issueDate', e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1 block">{current.type === 'invoice' ? 'Due Date' : 'Valid Until'}</label>
                <input type="date" value={current.dueDate} onChange={e => setField('dueDate', e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50" />
              </div>
            </div>
          </div>

          {/* Client info */}
          <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Client Info</h3>
              <div className="flex items-center gap-2">
                {current.customerId ? (
                  <>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>Assigned</span>
                    <button onClick={openCustomerPicker}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition"
                      style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#9ca3af' }}>
                      <User className="w-3 h-3" /> Change
                    </button>
                    <button onClick={unassignCustomer}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition"
                      style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f87171' }}>
                      <X className="w-3 h-3" /> Unassign
                    </button>
                  </>
                ) : (
                  <button onClick={openCustomerPicker}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black text-white transition hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
                    <UserPlus className="w-3 h-3" /> Assign Customer
                  </button>
                )}
              </div>
            </div>
            {[
              { key: 'clientName', label: 'Client Name', placeholder: 'John Smith', type: 'text' },
              { key: 'clientEmail', label: 'Email', placeholder: 'client@email.com', type: 'email' },
              { key: 'clientPhone', label: 'Phone', placeholder: '(555) 000-0000', type: 'tel' },
              { key: 'clientAddress', label: 'Address', placeholder: '123 Main St, City, State', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1 block">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={(current as any)[f.key]}
                  onChange={e => setField(f.key as keyof Invoice, e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
              </div>
            ))}
          </div>

          {/* Line items */}
          <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Line Items</h3>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setShowGenerator(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition hover:brightness-110"
                  style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: '#c084fc' }}>
                  <Zap className="w-3 h-3" /> Auto-Generate
                </button>
                <button onClick={openMaterialsPicker}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#9ca3af' }}>
                  <Plus className="w-3 h-3" /> Material
                </button>
                <button onClick={openLaborPicker}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#9ca3af' }}>
                  <Clock className="w-3 h-3" /> Labor
                </button>
                <button onClick={openSubQuote}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#9ca3af' }}>
                  <UserPlus className="w-3 h-3" /> Subcontractor
                </button>
                <div className="relative">
                  <button onClick={() => setShowPresets(p => !p)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                    style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#9ca3af' }}>
                    Presets <ChevronDown className="w-3 h-3" />
                  </button>
                  {showPresets && (
                    <div className="absolute right-0 top-full mt-1 w-64 rounded-xl z-10 overflow-hidden shadow-2xl"
                      style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                      {PRESET_ITEMS.map(p => (
                        <button key={p.description} onClick={() => addPreset(p)}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[#2a2a2a] transition">
                          <span className="text-xs text-gray-300 truncate">{p.description}</span>
                          <span className="text-xs font-bold text-orange-400 flex-shrink-0 ml-2">${p.rate}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={addItem}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black text-white transition hover:brightness-110"
                  style={{ background: '#ea580c' }}>
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
            </div>

            {/* Header row */}
            <div className="grid gap-2 text-[10px] font-black text-gray-600 uppercase tracking-widest px-1"
              style={{ gridTemplateColumns: '1fr 56px 80px 24px' }}>
              <span>Description</span><span className="text-center">Qty</span><span className="text-right">Rate</span><span />
            </div>

            <div className="space-y-2">
              {current.items.map(item => (
                <div key={item.id} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 56px 80px 24px' }}>
                  <input value={item.description} onChange={e => setItem(item.id, 'description', e.target.value)}
                    placeholder="Item description"
                    className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-orange-500/50" />
                  <input type="number" min="1" value={item.qty} onChange={e => setItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                    className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2 py-2 text-xs text-white text-center focus:outline-none focus:border-orange-500/50" />
                  <input type="number" min="0" step="0.01" value={item.rate} onChange={e => setItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                    className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2 py-2 text-xs text-white text-right focus:outline-none focus:border-orange-500/50" />
                  <button onClick={() => removeItem(item.id)} className="flex items-center justify-center w-6 h-6 rounded-lg hover:bg-red-500/20 transition">
                    <Trash2 className="w-3.5 h-3.5 text-gray-600 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="pt-3 space-y-1.5" style={{ borderTop: '1px solid #1e1e1e' }}>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span><span className="text-white">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <span>Tax</span>
                  <input type="number" min="0" max="20" step="0.1" value={current.taxRate}
                    onChange={e => setField('taxRate', parseFloat(e.target.value) || 0)}
                    className="w-14 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-orange-500/50" />
                  <span>%</span>
                </div>
                <span className="text-white">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black pt-2" style={{ borderTop: '1px solid #2a2a2a' }}>
                <span className="text-white">Total</span>
                <span style={{ color: '#ea580c' }}>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Plans & Renderings (buildable deliverables from Design Studio) */}
          {(deliverables.length > 0 || loadingDeliverables) && (
            <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5 space-y-3">
              <div className="flex items-center gap-2">
                <PenTool className="w-3.5 h-3.5 text-blue-400" />
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Plans &amp; Renderings</h3>
                <span className="text-[10px] text-gray-600">(buildable deliverables)</span>
              </div>
              {loadingDeliverables ? (
                <p className="text-xs text-gray-600 py-4 text-center">Loading deliverables…</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {deliverables.map(d => (
                    <div key={d.id} className="rounded-xl overflow-hidden group relative"
                      style={{ background: '#0a0a0a', border: '1px solid #1e1e1e' }}>
                      {d.signedUrl ? (
                        <a href={d.signedUrl} target="_blank" rel="noreferrer">
                          <img src={d.signedUrl} alt={d.name}
                            className="w-full h-28 object-cover bg-[#0a0a0a]" />
                        </a>
                      ) : (
                        <div className="w-full h-28 flex items-center justify-center text-gray-700 text-xs">No preview</div>
                      )}
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-white truncate">{d.name}</p>
                          <p className="text-[10px] text-gray-500 capitalize">{d.kind}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {d.signedUrl && (
                            <a href={d.signedUrl} download title="Download"
                              className="p-1 rounded hover:bg-white/10 transition">
                              <Download className="w-3.5 h-3.5 text-gray-400" />
                            </a>
                          )}
                          <button onClick={() => deleteDeliverable(d.id)} title="Remove"
                            className="p-1 rounded hover:bg-red-500/20 transition">
                            <Trash2 className="w-3.5 h-3.5 text-gray-600 hover:text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Design Studio materials waiting to be imported */}
          {current.designMaterials && current.designMaterials.length > 0 && (
            <div className="rounded-2xl p-5 space-y-3"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)' }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <PenTool className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-xs font-black text-blue-300 uppercase tracking-widest">From Design Studio</h3>
                    <p className="text-[11px] text-gray-500">{current.designMaterials.length} materials extracted from the layout</p>
                  </div>
                </div>
                <button onClick={importDesignMaterials}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black text-white transition hover:brightness-110 flex-shrink-0"
                  style={{ background: '#2563eb' }}>
                  <Plus className="w-3 h-3" /> Add all to line items
                </button>
              </div>
              <div className="space-y-1">
                {current.designMaterials.slice(0, 6).map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs text-gray-400">
                    <span className="truncate">{m.name} {m.quantity ? `× ${m.quantity}` : ''}</span>
                    <span className="text-gray-300 flex-shrink-0 ml-2">${Number(m.totalCost || (m.quantity || 0) * (m.unitCost || 0)).toFixed(2)}</span>
                  </div>
                ))}
                {current.designMaterials.length > 6 && (
                  <p className="text-[11px] text-gray-600">+ {current.designMaterials.length - 6} more…</p>
                )}
              </div>
            </div>
          )}

          {/* Subcontractor quotes on file (internal — NOT shown to the customer) */}
          {current.subQuotes && current.subQuotes.length > 0 && (
            <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5 space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-3.5 h-3.5 text-orange-400" />
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Subcontractor Quotes On File</h3>
                <span className="text-[10px] text-gray-600">(internal — kept on our side)</span>
              </div>
              {current.subQuotes.map(s => (
                <div key={s.id} className="flex items-start justify-between gap-3 rounded-xl px-4 py-3"
                  style={{ background: '#0a0a0a', border: '1px solid #1e1e1e' }}>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{s.subName}</p>
                    {s.description && <p className="text-xs text-gray-500">{s.description}</p>}
                    <p className="text-[11px] text-gray-600 mt-1">
                      Their quote <span className="text-gray-400">${s.baseAmount.toFixed(2)}</span>
                      {' '}· +{s.markupPct}% markup
                      {' '}· billed <span className="text-orange-400 font-bold">${s.total.toFixed(2)}</span>
                    </p>
                  </div>
                  <button onClick={() => removeSubQuote(s.id)}
                    className="flex items-center justify-center w-6 h-6 rounded-lg hover:bg-red-500/20 transition flex-shrink-0"
                    title="Remove from file (does not remove the customer line item)">
                    <Trash2 className="w-3.5 h-3.5 text-gray-600 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Notes / Payment Instructions</label>
            <textarea value={current.notes} onChange={e => setField('notes', e.target.value)} rows={3}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-orange-500/50" />
          </div>

          {/* Status actions */}
          {current.status !== 'draft' && (
            <div className="flex gap-2">
              {current.status !== 'paid' && (
                <button onClick={markPaid}
                  className="flex-1 py-3 rounded-2xl font-black text-sm text-white transition hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                  ✅ Mark as Paid
                </button>
              )}
              {current.status === 'paid' && (
                <div className="flex-1 py-3 rounded-2xl text-center font-black text-sm text-green-400"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  ✅ Paid
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PREVIEW VIEW ──────────────────────────────────────────────────── */}
      {view === 'preview' && current && (
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setView('edit')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Edit
            </button>
            <button onClick={sendDoc} disabled={sending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white transition hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
              <Send className="w-3.5 h-3.5" /> {sending ? 'Sending…' : 'Send to Client'}
            </button>
          </div>

          {/* Document */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', color: '#111' }}>
            {/* Header */}
            <div className="px-8 pt-8 pb-6 flex items-start justify-between" style={{ borderBottom: '2px solid #f3f4f6' }}>
              <div>
                <img src={companyLogo} alt="Black Phoenix" className="h-12 w-auto object-contain mb-2"
                  style={{ filter: 'none' }} />
                <p className="text-xs text-gray-500 font-medium">Black Phoenix Company</p>
                <p className="text-xs text-gray-400">hello@theblackphoenixcompany.com</p>
                <p className="text-xs text-gray-400">theblackphoenixcompany.com</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black uppercase" style={{ color: '#ea580c' }}>{current.type}</p>
                <p className="text-sm font-mono text-gray-500 mt-1">{current.number}</p>
                <div className="mt-3 space-y-0.5">
                  <p className="text-xs text-gray-500">Issued: <strong className="text-gray-800">{current.issueDate}</strong></p>
                  <p className="text-xs text-gray-500">{current.type === 'invoice' ? 'Due' : 'Valid Until'}: <strong className="text-gray-800">{current.dueDate}</strong></p>
                </div>
              </div>
            </div>

            {/* Bill to */}
            <div className="px-8 py-5" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Bill To</p>
              <p className="font-black text-gray-900">{current.clientName || '—'}</p>
              {current.clientEmail && <p className="text-xs text-gray-500">{current.clientEmail}</p>}
              {current.clientPhone && <p className="text-xs text-gray-500">{current.clientPhone}</p>}
              {current.clientAddress && <p className="text-xs text-gray-500">{current.clientAddress}</p>}
            </div>

            {/* Line items */}
            <div className="px-8 py-5">
              <div className="grid text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 pb-2"
                style={{ gridTemplateColumns: '1fr 60px 80px 90px', borderBottom: '1px solid #e5e7eb' }}>
                <span>Description</span><span className="text-center">Qty</span><span className="text-right">Rate</span><span className="text-right">Amount</span>
              </div>
              {current.items.map(item => (
                <div key={item.id} className="grid py-2 text-sm"
                  style={{ gridTemplateColumns: '1fr 60px 80px 90px', borderBottom: '1px solid #f9fafb' }}>
                  <span className="text-gray-800">{item.description || '—'}</span>
                  <span className="text-center text-gray-600">{item.qty}</span>
                  <span className="text-right text-gray-600">${item.rate.toFixed(2)}</span>
                  <span className="text-right font-bold text-gray-800">${(item.qty * item.rate).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="px-8 pb-6 flex justify-end">
              <div className="w-48 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                </div>
                {current.taxRate > 0 && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Tax ({current.taxRate}%)</span><span>${tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-base pt-2" style={{ borderTop: '2px solid #111' }}>
                  <span>Total</span><span style={{ color: '#ea580c' }}>${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {current.notes && (
              <div className="px-8 pb-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Notes</p>
                <p className="text-xs text-gray-500 leading-relaxed">{current.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="px-8 py-4 text-center text-xs text-gray-400"
              style={{ background: '#f9fafb', borderTop: '1px solid #f3f4f6' }}>
              Thank you for choosing Black Phoenix Company — Family Owned & Operated
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOMER PICKER MODAL ─────────────────────────────────────────── */}
      {showCustomerPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowCustomerPicker(false)}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
            style={{ background: '#111', border: '1px solid #2a2a2a', maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#1e1e1e]">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-orange-400" /> Assign Customer
              </h3>
              <button onClick={() => setShowCustomerPicker(false)} className="text-gray-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 border-b border-[#1e1e1e]">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input autoFocus value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                  placeholder="Search customers by name or email…"
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {contacts.length === 0 && (
                <p className="text-center text-xs text-gray-600 py-10">Loading customers…</p>
              )}
              {contacts
                .filter(c => {
                  const q = contactSearch.toLowerCase().trim();
                  if (!q) return true;
                  return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
                })
                .map(c => (
                  <button key={c.id} onClick={() => assignCustomer(c)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1a1a1a] transition border-b border-[#151515]">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(234,88,12,0.15)' }}>
                      <User className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{c.name || c.email}</p>
                      <p className="text-xs text-gray-500 truncate">{c.email || c.phone || '—'}</p>
                    </div>
                  </button>
                ))}
              {contacts.length > 0 && contacts.filter(c => {
                const q = contactSearch.toLowerCase().trim();
                if (!q) return true;
                return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
              }).length === 0 && (
                <p className="text-center text-xs text-gray-600 py-10">No matching customers.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MATERIALS PICKER MODAL ────────────────────────────────────────── */}
      {showMaterialsPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowMaterialsPicker(false)}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
            style={{ background: '#111', border: '1px solid #2a2a2a', maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#1e1e1e]">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-orange-400" /> Add from Materials Hub
              </h3>
              <button onClick={() => setShowMaterialsPicker(false)} className="text-gray-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 border-b border-[#1e1e1e]">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input autoFocus value={materialSearch} onChange={e => setMaterialSearch(e.target.value)}
                  placeholder="Search materials by name, SKU, category…"
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {materials.length === 0 && (
                <p className="text-center text-xs text-gray-600 py-10">No materials in catalog.</p>
              )}
              {materials
                .filter(m => {
                  const q = materialSearch.toLowerCase().trim();
                  if (!q) return true;
                  return (m.name || '').toLowerCase().includes(q)
                    || (m.sku || '').toLowerCase().includes(q)
                    || (m.category || '').toLowerCase().includes(q);
                })
                .slice(0, 100)
                .map(m => (
                  <button key={m.id} onClick={() => addMaterialLine(m)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#1a1a1a] transition border-b border-[#151515]">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{m.name}</p>
                      <p className="text-xs text-gray-500 truncate">{m.category}{m.unit ? ` · ${m.unit}` : ''}{m.sku ? ` · ${m.sku}` : ''}</p>
                    </div>
                    <span className="text-xs font-black text-orange-400 flex-shrink-0">${(m.basePrice || 0).toFixed(2)}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LABOR PICKER MODAL ────────────────────────────────────────────── */}
      {showLaborPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowLaborPicker(false)}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
            style={{ background: '#111', border: '1px solid #2a2a2a', maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#1e1e1e]">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" /> Add Labor (tech tier rate)
              </h3>
              <button onClick={() => setShowLaborPicker(false)} className="text-gray-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {(laborTiers.length > 0 ? laborTiers : DEFAULT_LABOR_TIERS).map(t => (
                <button key={t.id} onClick={() => addLaborLine(t)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#1a1a1a] transition border-b border-[#151515]">
                  <p className="text-sm font-bold text-white truncate">{t.label}</p>
                  <span className="text-xs font-black text-orange-400 flex-shrink-0">${(t.hourlyRate || 0).toFixed(2)}/hr</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── AUTO-GENERATE MODAL ───────────────────────────────────────────── */}
      {showGenerator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowGenerator(false)}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: '#111', border: '1px solid #2a2a2a' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#1e1e1e]">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: '#c084fc' }} /> Auto-Generate Quote
              </h3>
              <button onClick={() => setShowGenerator(false)} className="text-gray-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">Pick a service type and target value — we'll fill in materials &amp; labor lines automatically. This replaces the current line items.</p>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Service Type</label>
                <select value={genServiceType} onChange={e => setGenServiceType(e.target.value)}
                  className="w-full mt-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50">
                  {['Kitchen Remodel','Bathroom Remodel','HVAC Installation','Electrical Work','Plumbing Repair','Roofing','Flooring Installation','Interior Painting','Deck Construction','Window & Door Replacement','General Contracting'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estimated Value ($)</label>
                <input type="number" value={genValue} onChange={e => setGenValue(Number(e.target.value))}
                  className="w-full mt-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50" />
              </div>
              <button onClick={runAutoGenerate}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-black text-white transition hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
                <Zap className="w-4 h-4" /> Generate Line Items
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBCONTRACTOR QUOTE MODAL ─────────────────────────────────────── */}
      {showSubQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowSubQuote(false)}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: '#111', border: '1px solid #2a2a2a' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#1e1e1e]">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-orange-400" /> Add Subcontractor Quote
              </h3>
              <button onClick={() => setShowSubQuote(false)} className="text-gray-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">
                Fold a sub's quote into yours with a markup. The customer sees one marked-up line — we keep their
                original quote on file.
              </p>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subcontractor Name</label>
                <input autoFocus value={subName} onChange={e => setSubName(e.target.value)}
                  placeholder="e.g. Ace Electric LLC"
                  className="w-full mt-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Scope / Description</label>
                <textarea value={subDescription} onChange={e => setSubDescription(e.target.value)}
                  placeholder="e.g. Rewire panel + install 6 outlets"
                  rows={2}
                  className="w-full mt-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Their Quote ($)</label>
                  <input type="number" value={subAmount} onChange={e => setSubAmount(Number(e.target.value))}
                    className="w-full mt-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Markup (%)</label>
                  <input type="number" value={subMarkup} onChange={e => setSubMarkup(Number(e.target.value))}
                    className="w-full mt-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50" />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.25)' }}>
                <span className="text-xs font-bold text-gray-400">Customer-facing line total</span>
                <span className="text-lg font-black text-orange-400">
                  ${(subAmount * (1 + (Number(subMarkup) || 0) / 100)).toFixed(2)}
                </span>
              </div>
              <button onClick={addSubQuote}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-black text-white transition hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
                <Plus className="w-4 h-4" /> Add to Quote &amp; Save Sub's Original
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
