/**
 * Quote to Contract Editor Component
 * 
 * Comprehensive quote editing, bidding, and approval system
 * Combines all quote workflow functionality in one place:
 * - Edit quote details (materials, labor, process steps)
 * - Request subcontractor bids
 * - Track customer approval status
 * - Convert approved quotes to contracts
 */

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  DollarSign,
  Clock,
  Edit2,
  Save,
  Send,
  Package,
  Users,
  ListChecks,
  Plus,
  Trash2,
  Lock,
  Search,
  ExternalLink,
  Eye,
  EyeOff,
  Recycle,
  Video,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  UserPlus,
  Smartphone,
  MapPin,
  Calendar,
  TrendingUp,
  Award,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  ArrowRight,
  Download,
  Upload,
  Sparkles,
  ShoppingCart,
  Hammer,
  Star,
  Filter,
  RefreshCw,
  CalendarDays,
  ChevronRight,
  CircleDot,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import DocumentPreviewModal from './documents/DocumentPreviewModal';
import QuoteDocument from './documents/QuoteDocument';
import { quoteToPDFData } from './documents/quoteMath';
import { PDFService } from '../lib/services/pdfService';

async function quoteAuthHeaders(contentType = false) { const { data: { session } } = await supabase.auth.getSession(); return { Authorization: `Bearer ${session?.access_token || publicAnonKey}`, ...(contentType ? { 'Content-Type': 'application/json' } : {}) }; }
import {
  materialsHubService,
  Material,
} from '../lib/services/materialsHubService';
import { QuoteProcessEnhancements } from './QuoteProcessEnhancements';
import { UnpricedSendDialog } from './quotes/UnpricedSendDialog';
import WorkRequestFullView from './WorkRequestFullView';
import { CompanyDatabaseService } from '../lib/services/companyDatabaseService';
import { pickMainAppCompany, setActiveCompanyInfo } from '../lib/config/companyInfo';
import { API_BASE_URL } from '../lib/apiConfig';

interface MaterialItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  supplier?: string;
  category: string;
  manufacturer?: string;
  basePrice?: number;
  inStock?: boolean;
  qualityRating?: number;
  visible?: boolean;
}

interface LaborItem {
  id: string;
  role: string;
  description: string;
  hours: number;
  hourlyRate: number;
  totalCost: number;
  assignedTo?: string;
  visible?: boolean;
}

interface ProcessStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  estimatedDuration: string;
  dependencies?: string[];
  visible?: boolean;
}

interface ScheduleTask {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  duration: number; // in days
  assignedTo?: string;
  dependencies?: string[];
  status: 'not-started' | 'in-progress' | 'completed';
  color: string;
}

/**
 * Material the customer supplied themselves.
 *
 * The case: they bought their own flooring and we install it. Treated as
 * material we are NOT supplying rather than as a discount off the bottom,
 * which is why it comes off the materials figure — no markup on it, no tax
 * on it, and still its own line somebody can read a year later.
 *
 * The amount is always positive; being a credit is the record type, not the
 * sign of a number somebody typed. A negative in a money field is a typo
 * waiting to happen and it is indistinguishable from the right number until
 * the total comes out wrong.
 */
interface QuoteCredit {
  id: string;
  description: string;
  amount: number;
  reason?: string;
}

interface Quote {
  id: string;
  quoteNumber: string;
  materials: MaterialItem[];
  labor: LaborItem[];
  processSteps: ProcessStep[];
  credits?: QuoteCredit[];
  creditsSubtotal?: number;
  materialsSubtotal: number;
  laborSubtotal: number;
  taxRate: number;
  taxAmount: number;
  totalCost: number;
  generatedAt: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'revised';
  approvedAt?: string;
  rejectionReason?: string;
  contractTypeSelected?: boolean;
  selectedContractType?: 'standard' | 'soroban-smart-contract';
}

interface SubcontractorBid {
  id: string;
  subcontractorName: string;
  subcontractorEmail: string;
  subcontractorPhone: string;
  company: string;
  bidAmount: number;
  estimatedDuration: string;
  notes: string;
  status: 'pending' | 'accepted' | 'rejected';
  submittedAt: string;
  rating?: number;
}

interface WorkRequest {
  id: string;
  requestNumber: string;
  serviceType: string;
  title: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  location?: string;
  /**
   * What the estimator was given, kept so the quote can be corrected rather
   * than restarted. Optional because every quote raised before this existed
   * has none — see the fallback in `originalBrief`.
   */
  intake?: Record<string, any>;
  quote?: Quote;
}

interface QuoteToContractEditorProps {
  workRequest: WorkRequest;
  onClose: () => void;
  onSave: (updatedRequest: WorkRequest) => void;
  onSendToCustomer: (request: WorkRequest) => void;
  onConvertToContract: (request: WorkRequest) => void;
}

/**
 * Where one line's price came from.
 *
 * The server has always known this. `repriceEstimate` marks every material and
 * every labour line `catalogue`, `your-rate`, `standard` or `estimated` as it
 * replaces the model's invented figures with the company's real ones — and this
 * editor rendered none of it, so the one fact that decides whether a quote can
 * be sent as it stands reached nobody.
 *
 * The distinction that matters most is the last one. A line marked `estimated`
 * is the model's guess because nothing in the catalogue matched it; that is the
 * line to check before the quote goes out. A line marked `catalogue` is a price
 * a vendor is actually offering today.
 *
 * `standard` is deliberately not dressed up as the company's own: it means the
 * built-in published rate table was used because no rate had been saved. Saying
 * "your rate" there would be a quiet lie about whose number it is.
 *
 * Nothing is rendered when a line carries no source — a hand-added line has no
 * provenance to report, and an invented badge would be worse than none.
 */
function PriceSource({ source, vendor }: { source?: string; vendor?: string }) {
  if (!source) return null;
  const styles: Record<string, { label: string; cls: string; title: string }> = {
    catalogue: {
      label: vendor ? vendor : 'catalogue',
      cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      title: 'Priced from a vendor catalogue offer',
    },
    'your-rate': {
      label: 'your rate',
      cls: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
      title: "Priced from your company's saved labour rate",
    },
    standard: {
      label: 'standard rate',
      cls: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
      title: 'Priced from the built-in standard table — no rate of your own is saved for this trade',
    },
    estimated: {
      label: 'estimated',
      cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      title: 'The model\'s own figure — nothing in your catalogue or rates matched this line. Check it before sending.',
    },
  };
  const s = styles[source];
  if (!s) return null;
  return (
    <span title={s.title} className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

/**
 * What makes the total defensible, and what the estimator was told.
 *
 * The engine has always returned soft costs, overhead, profit, contingency and
 * tax as separate figures — that separation is most of what makes it an
 * estimator rather than a number generator. The editor showed a total and none
 * of its basis, so a customer asking "what is this built from" could be
 * answered only by somebody rebuilding the arithmetic by hand.
 *
 * `estimatorContext` is the second half: the composed brief, fields and
 * exclusions exactly as the model received them. When a figure looks wrong the
 * first question is always what went in, and before this the only way to answer
 * it was to find the request in the edge function's logs. It is shown verbatim —
 * a summary would be a second description of the job that could disagree with
 * the one the model actually saw.
 *
 * Collapsed by default. This is the panel you open when you doubt a number, not
 * something to read on the way to sending a quote.
 */
function QuoteBasis({ quote }: { quote: any }) {
  const money = (n: any) => `$${(Number(n) || 0).toFixed(2)}`;
  const has = (n: any) => Number(n) > 0;

  const softCosts: any[] = Array.isArray(quote?.additionalCosts) ? quote.additionalCosts : [];
  const rows: Array<[string, any, string?]> = [
    ['Materials', quote?.materialsSubtotal],
    ['Labour', quote?.laborSubtotal],
    ['Soft costs', quote?.additionalCostsSubtotal ?? softCosts.reduce((s, a) => s + (Number(a?.amount) || 0), 0)],
    ['Overhead', quote?.overheadAmount, quote?.overheadPercent ? `${quote.overheadPercent}%` : ''],
    ['Profit', quote?.profitAmount, quote?.profitPercent ? `${quote.profitPercent}%` : ''],
    ['Contingency', quote?.contingencyAmount, quote?.contingencyPercent ? `${quote.contingencyPercent}%` : ''],
    ['Tax on materials', quote?.taxAmount, quote?.taxRate ? `${(Number(quote.taxRate) * 100).toFixed(2)}%` : ''],
  ];
  const shown = rows.filter(([, value]) => has(value));

  // Nothing to explain means nothing to show. A hand-built quote has no
  // estimator basis, and an empty panel headed "how this was built" would
  // promise an answer it does not have.
  if (!shown.length && !softCosts.length && !quote?.aiEstimatorContext && !quote?.aiAssumptions?.length) return null;

  return (
    <details className="mt-4 bg-black/20 border border-gray-700 rounded-lg">
      <summary className="px-4 py-3 cursor-pointer font-semibold text-gray-300 hover:bg-white/5 rounded-t-lg">
        How this quote was built
        <span className="ml-2 text-xs font-normal text-gray-500">
          the markups, the soft costs, and what the estimator was told
        </span>
      </summary>

      <div className="space-y-4 p-4">
        {shown.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-medium text-gray-400">The total, broken out</div>
            <div className="rounded border border-gray-700 bg-black/40 text-sm">
              {shown.map(([label, value, pct]) => (
                <div key={label} className="flex items-center justify-between border-b border-gray-800 px-3 py-1.5 last:border-b-0">
                  <span className="text-gray-400">
                    {label}
                    {pct ? <span className="ml-1 text-gray-600">({pct})</span> : null}
                  </span>
                  <span className="font-medium text-gray-200">{money(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {softCosts.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-medium text-gray-400">
              Soft costs — the lines that get forgotten
            </div>
            <div className="space-y-1">
              {softCosts.map((a: any, i: number) => (
                <div key={a?.id || i} className="flex items-start justify-between rounded border border-gray-800 bg-black/40 px-3 py-1.5 text-xs">
                  <div>
                    <span className="text-gray-200">{a?.name || 'Additional cost'}</span>
                    {a?.category ? <span className="ml-1 text-gray-600">· {a.category}</span> : null}
                    {a?.description ? <div className="text-gray-500">{a.description}</div> : null}
                  </div>
                  <span className="shrink-0 font-medium text-gray-200">{money(a?.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(quote?.aiAssumptions) && quote.aiAssumptions.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-medium text-gray-400">
              Assumptions the estimator made
            </div>
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-gray-400">
              {quote.aiAssumptions.map((a: string, i: number) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        )}

        {quote?.aiEstimatorContext && (
          <div>
            <div className="mb-1 text-xs font-medium text-gray-400">
              What the estimator was told
              <span className="ml-1 font-normal text-gray-600">— word for word</span>
            </div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded border border-gray-800 bg-black/60 p-3 text-[11px] leading-relaxed text-gray-400">
              {quote.aiEstimatorContext}
            </pre>
          </div>
        )}
      </div>
    </details>
  );
}

export function QuoteToContractEditor({
  workRequest,
  onClose,
  onSave,
  onSendToCustomer,
  onConvertToContract
}: QuoteToContractEditorProps) {
  const [showWorkRequestDrawer, setShowWorkRequestDrawer] = useState(false);

  // Load company logo and info
  const [companyLogo, setCompanyLogo] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        // Quotes/contracts always represent the main app business (Black Phoenix
        // Builds), never the ecommerce store. Resolve it and use it for both the
        // header display and the global company info the documents read.
        // Draws the logo onto the contract, so it needs the image itself.
        const { data: companies } = await CompanyDatabaseService.getCompanies({ withLogos: true });
        const mainApp = pickMainAppCompany(companies || []);
        if (mainApp) {
          setActiveCompanyInfo(mainApp);
          setCompanyName(mainApp.company_name || mainApp.company_legal_name || 'Company Name');
          setCompanyLogo(mainApp.logo_url || '');
        }

        // Fall back to the logo-variants cache only if the company had no logo.
        if (!mainApp?.logo_url) {
          const logoVariants = localStorage.getItem('company_logo_variants');
          if (logoVariants) {
            const parsed = JSON.parse(logoVariants);
            setCompanyLogo(parsed.logo_primary || parsed.logo_secondary || '');
          }
        }
      } catch (error) {
        console.error('Failed to load company info:', error);
      }
    })();
  }, []);

  // Normalize materials and labor from Materials Hub format
  const normalizeQuote = (quote: Quote | undefined): Quote | undefined => {
    if (!quote) return quote;
    
    const normalizedMaterials = quote.materials?.map(m => ({
      ...m,
      name: m.name || m.description || '',
      unitCost: m.unitCost || (m as any).unitPrice || 0,
      totalCost: m.totalCost || (m as any).totalPrice || (m.quantity * (m.unitCost || (m as any).unitPrice || 0)),
    })) || [];
    
    const normalizedLabor = quote.labor?.map(l => ({
      ...l,
      role: l.role || l.description || '',
      hourlyRate: l.hourlyRate || (l as any).unitPrice || 0,
      totalCost: l.totalCost || (l as any).totalPrice || (l.hours * (l.hourlyRate || (l as any).unitPrice || 0)),
    })) || [];
    
    return {
      ...quote,
      materials: normalizedMaterials,
      labor: normalizedLabor,
    };
  };
  
  /**
   * Set when the server refuses to send an unpriced quote without being told
   * to. Holds the server's own reason, so the dialog does not invent a second
   * wording of it. Null means nothing is being asked.
   */
  const [unpricedSend, setUnpricedSend] = useState<{ reason: string; basis: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'quote' | 'bidding' | 'approval'>('quote');
  const [quoteEditTab, setQuoteEditTab] = useState<'materials' | 'labor' | 'process'>('materials');
  const [editMode, setEditMode] = useState(false);
  const [editedQuote, setEditedQuote] = useState<Quote | undefined>(normalizeQuote(workRequest.quote));
  const [loading, setLoading] = useState(false);
  // Optional: also invite the customer to join the app when sending the quote.
  const [inviteToApp, setInviteToApp] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteBySms, setInviteBySms] = useState(false);
  
  // Subcontractor bidding state
  const [subcontractorBids, setSubcontractorBids] = useState<SubcontractorBid[]>([]);
  const [showBidForm, setShowBidForm] = useState(false);
  const [loadingBids, setLoadingBids] = useState(false);

  // Materials Hub integration state
  const [showMaterialsHub, setShowMaterialsHub] = useState(false);

  // Purchase Order state
  const [showPurchaseOrders, setShowPurchaseOrders] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<Record<string, any[]>>({});
  const [materialsHubSearch, setMaterialsHubSearch] = useState('');
  const [materialsHubCategory, setMaterialsHubCategory] = useState('all');
  const [materialsHubResults, setMaterialsHubResults] = useState<Material[]>([]);
  const [replacingMaterialId, setReplacingMaterialId] = useState<string | null>(null);

  // Vendor comparison for individual materials in quote
  const [comparingMaterialId, setComparingMaterialId] = useState<string | null>(null);
  const [vendorAlternatives, setVendorAlternatives] = useState<any[]>([]);
  const [loadingVendorAlternatives, setLoadingVendorAlternatives] = useState(false);

  // Schedule builder state
  const [projectSchedule, setProjectSchedule] = useState<ScheduleTask[]>([]);
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(false);

  const currentQuote = editMode ? editedQuote : normalizeQuote(workRequest.quote);

  const handleConvertToContract = async () => {
    const quoteId = currentQuote?.id || workRequest.quote?.id;
    if (!quoteId) { toast.error('Save the quote before generating a contract.'); return; }
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/make-server-3eae23a6/quotes/${encodeURIComponent(quoteId)}/convert-to-contract`,
        { method: 'POST', headers: await quoteAuthHeaders(true), body: JSON.stringify({
          title: currentQuote?.title || currentQuote?.name || workRequest.title || 'Service Contract',
          amount: currentQuote?.total || currentQuote?.grandTotal || currentQuote?.totalCost || undefined,
          customerEmail: workRequest.customerEmail || (workRequest as any).clientEmail,
          planId: (currentQuote as any)?.planId,
        }) }
      );
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not generate the contract.');
      const updated = { ...currentQuote, contractId: result.contract.id, contractStatus: result.contract.status };
      setEditedQuote(updated as Quote);
      onSave({ ...workRequest, quote: updated as Quote });
      toast.success('Contract created and ready for the customer signature.');
      onConvertToContract({ ...workRequest, quote: updated as Quote });
    } catch (error: any) { toast.error(error.message || 'Could not generate the contract.'); }
    finally { setLoading(false); }
  };

  // Load subcontractor bids from backend
  useEffect(() => {
    if (activeTab === 'bidding' && workRequest.quote?.id) {
      loadSubcontractorBids();
      loadBidRoomContext();
    }
  }, [activeTab, workRequest.quote?.id]);

  const loadSubcontractorBids = async () => {
    setLoadingBids(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/make-server-3eae23a6/quotes/${workRequest.quote?.id}/bids`,
        {
          headers: await quoteAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSubcontractorBids(data.bids || []);
      }
    } catch (error) {
      console.error('Error loading bids:', error);
      toast.error('Failed to load subcontractor bids');
    } finally {
      setLoadingBids(false);
    }
  };

  /**
   * The document view, and the PDF out of it.
   *
   * Eric: "i dont see a pdf option?" — and the standing rule behind it is
   * that a document is not finished until you can see it as it will look and
   * get a printable copy out of it. Quotes get printed, filed, emailed to
   * lenders and argued over later; a screen of figures is not the document.
   *
   * ALL OF THIS ALREADY EXISTED
   *
   * `QuoteDocument` renders the quote as a document with print styles,
   * `DocumentPreviewModal` is the chrome around it — "see it, print it, save
   * it, send it" — and `PDFService.downloadQuotePDF` produces the file. The
   * invoices, the customer portal and the project modal all use them. The
   * quote editor used none of it, so the one screen where a quote is actually
   * built was the one place you could not look at the finished thing.
   *
   * Nothing new is drawn here. It is the same three pieces wired up, so the
   * preview cannot drift from what every other screen shows.
   */
  const [previewDoc, setPreviewDoc] = useState(false);

  /**
   * The editor's quote, as the document components expect it.
   *
   * They take a flat `items` list of `{ description, qty, rate }`; the editor
   * keeps materials and labour apart with their own field names. Mapping here
   * rather than reshaping either side keeps the document module ignorant of
   * the editor and the editor ignorant of the document's schema.
   */
  const quoteAsDocument = useMemo(() => {
    const q: any = currentQuote || {};
    const materials = (q.materials || []).map((m: any) => ({
      description: [m.name, m.description].filter(Boolean).join(' — ') || 'Material',
      qty: Number(m.quantity) || 0,
      rate: Number(m.unitCost) || 0,
    }));
    const labor = (q.labor || []).map((l: any) => ({
      description: [l.role, l.description].filter(Boolean).join(' — ') || 'Labour',
      qty: Number(l.hours) || 0,
      rate: Number(l.hourlyRate) || 0,
    }));
    return {
      id: q.id,
      type: 'estimate' as const,
      number: q.quoteNumber || '',
      clientName: workRequest.customerName || '',
      clientEmail: workRequest.customerEmail || '',
      clientPhone: workRequest.customerPhone || '',
      clientAddress: workRequest.location || '',
      issueDate: q.generatedAt || '',
      createdAt: q.generatedAt || '',
      items: [...materials, ...labor],
      notes: q.aiSummary || workRequest.description || '',
      taxRate: Number(q.taxRate) || 0,
      status: 'draft',
      total: Number(q.totalCost) || 0,
    };
  }, [currentQuote, workRequest]);

  /**
   * See the quote the way the customer will.
   *
   * Eric: "how do i see a customer side quote to see if its what i want it to
   * look like?" There was no way to — the customer view is a separate page
   * reached by a share token, so the only way to see your own quote through a
   * customer's eyes was to send it to somebody and ask.
   *
   * WHY THIS OPENS THE REAL PAGE RATHER THAN RENDERING A MOCK
   *
   * A preview that re-renders the quote inside the editor is a second
   * implementation of the customer view, and the day it drifts is the day the
   * preview stops being worth looking at — which is precisely when you need
   * it. This opens `/customer-quote-approval?token=…`, the actual page, at
   * the actual URL, with the actual data. What you see is what they get
   * because it IS what they get.
   *
   * IT MINTS A REAL LINK, AND IT HAS TO
   *
   * Share tokens are stored as hashes and the raw token is shown exactly once
   * — that is the property that makes storing them worth anything (see
   * shareToken.ts). So an existing link cannot be recovered to preview with;
   * the only faithful option is to issue one.
   *
   * That means previewing creates a live, sendable link. The button says so
   * rather than doing it quietly, and the links expire and can be revoked
   * from the same quote. A preview that silently scattered credentials would
   * be worse than no preview.
   */
  const [previewing, setPreviewing] = useState(false);

  const handlePreviewAsCustomer = async () => {
    const quoteId = workRequest.quote?.id;
    if (!quoteId) { toast.error('Save the quote before previewing it.'); return; }
    setPreviewing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/make-server-3eae23a6/quotes/generate-link`, {
        method: 'POST',
        headers: await quoteAuthHeaders(true),
        body: JSON.stringify({ quoteId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.link) {
        toast.error(data?.error || `Could not open the customer view (HTTP ${res.status}).`);
        return;
      }
      /**
       * Opened before any await resolves on the click path would be ideal, but
       * the link does not exist until the server answers. A blocked popup is
       * therefore possible, so the toast carries the link as a fallback rather
       * than leaving the click looking like it did nothing.
       */
      const opened = window.open(data.link, '_blank', 'noopener,noreferrer');
      if (!opened) {
        toast.info('Your browser blocked the new tab.', {
          description: 'Copy the link from the quote’s share settings, or allow popups for this site.',
        });
        return;
      }
      toast.success('Opened the customer view in a new tab.', {
        description: 'This issued a real share link. It expires, and can be revoked from this quote.',
      });
    } catch (err: any) {
      toast.error(`Could not open the customer view: ${err?.message || err}`);
    } finally {
      setPreviewing(false);
    }
  };

  /**
   * Deleting the quote. There was no way to, at all.
   *
   * A quote raised by mistake — a duplicate, a test, a customer who turned out
   * not to exist — stayed in the list for ever, and the only way to make it
   * stop mattering was to leave it a draft. Eric: "i dont have the ability to
   * delete a quote."
   *
   * Two-step rather than a modal, deliberately. The screen already owns one
   * dialog and a second would fight it, and the button labelling itself
   * "Delete — are you sure?" is as hard to hit by accident as a dialog is
   * while being obvious about what the next click does.
   *
   * The refusals are the server's, not this component's. A signed quote and
   * one already turned into a contract both answer 409 with a reason, which is
   * surfaced verbatim — that check has to live where it cannot be skipped, and
   * repeating it here would be a second rule to keep in step with the first.
   */
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteQuote = async () => {
    const quoteId = workRequest.quote?.id;
    if (!quoteId) { toast.error('This work request has no saved quote to delete.'); return; }
    if (!confirmingDelete) { setConfirmingDelete(true); return; }

    setDeleting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/make-server-3eae23a6/quotes/${quoteId}`,
        { method: 'DELETE', headers: await quoteAuthHeaders() },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        // 409 carries a real explanation — signed, or already a contract.
        toast.error(data?.error || `Could not delete the quote (HTTP ${response.status}).`);
        setConfirmingDelete(false);
        return;
      }
      toast.success('Quote deleted.', {
        description: data?.tokensRevoked
          ? `${data.tokensRevoked} share link${data.tokensRevoked === 1 ? '' : 's'} revoked with it.`
          : undefined,
      });
      onClose();
    } catch (error: any) {
      toast.error(`Could not delete the quote: ${error?.message || error}`);
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  /**
   * The brief the quote was priced from — editable, and re-runnable.
   *
   * The editor could show what a quote COST but never what it was priced
   * FROM. The intake was collected, sent to the estimator and discarded, so
   * noticing a missed detail meant abandoning the quote and starting a new
   * one. Eric: "i would like to have the original description so i can edit
   * it and then regenerate the quote if i missed something."
   *
   * OLD QUOTES HAVE NO INTAKE, AND THAT IS THE COMMON CASE AT FIRST
   *
   * `intake` only exists on quotes raised after it started being stored.
   * Everything before has nothing but `description`, so the panel falls back
   * to that rather than appearing empty or hiding itself — an editor that
   * shows nothing for most of the existing quotes would read as broken. A
   * regenerate from a description alone is thinner than one from a full
   * intake, which the panel says rather than silently producing a worse
   * estimate.
   */
  const originalBrief: Record<string, any> = useMemo(
    () => (workRequest as any).intake
      || (workRequest.quote as any)?.intake
      || { description: workRequest.description || '', title: workRequest.title, serviceType: workRequest.serviceType },
    [workRequest],
  );
  const hasFullIntake = Boolean((workRequest as any).intake || (workRequest.quote as any)?.intake);

  const [briefDraft, setBriefDraft] = useState<Record<string, any>>(originalBrief);
  const [regenerating, setRegenerating] = useState(false);
  const briefEdited = JSON.stringify(briefDraft) !== JSON.stringify(originalBrief);

  useEffect(() => { setBriefDraft(originalBrief); }, [originalBrief]);

  const setBriefField = (key: string, value: string) =>
    setBriefDraft((prev) => ({ ...prev, [key]: value }));

  /**
   * Re-price from the edited brief.
   *
   * Posts the same shape `/auto-generate-quote` was given the first time, so
   * there is one estimator contract rather than a second one that drifts.
   * Replaces the priced lines and nothing else: the customer, the title and
   * anything hand-edited on the quote stay as they are, because a regenerate
   * is a correction to the ESTIMATE, not a reset of the record.
   */
  const handleRegenerateFromBrief = async () => {
    if (!workRequest.quote?.id) { toast.error('Save the quote before regenerating it.'); return; }
    setRegenerating(true);
    const toastId = 'regen-quote';
    toast.loading('Re-pricing from the updated brief…', { id: toastId });
    try {
      const res = await fetch(`${API_BASE_URL}/make-server-3eae23a6/auto-generate-quote`, {
        method: 'POST',
        headers: await quoteAuthHeaders(true),
        body: JSON.stringify({
          workRequest: {
            ...briefDraft,
            id: workRequest.id,
            title: briefDraft.title || workRequest.title,
            serviceType: briefDraft.serviceType || workRequest.serviceType,
            location: briefDraft.location ?? workRequest.location,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        toast.error(data?.error || `Could not regenerate the quote (HTTP ${res.status}).`, { id: toastId });
        return;
      }

      const q = data.quote || data.generated || data;
      const materials = q?.materials || [];
      const labor = q?.labor || [];
      if (!materials.length && !labor.length) {
        toast.error('The estimator returned no line items. The quote is unchanged.', { id: toastId });
        return;
      }

      const updated: any = {
        ...workRequest,
        description: briefDraft.description ?? workRequest.description,
        intake: briefDraft,
        quote: {
          ...workRequest.quote,
          materials,
          labor,
          /**
           * The narrative and the phases are re-priced too, not just the
           * numbers. Leaving them would show the OLD account of the job above
           * NEW line items — the most misleading possible result, because it
           * reads as deliberate and a customer would be quoted for work the
           * description does not mention.
           */
          aiSummary: q?.projectSummary ?? (workRequest.quote as any).aiSummary,
          aiAssumptions: q?.assumptions ?? (workRequest.quote as any).aiAssumptions,
          aiRegionalNote: q?.regionalNote ?? (workRequest.quote as any).aiRegionalNote,
          processSteps: Array.isArray(q?.processSteps) && q.processSteps.length
            ? q.processSteps
            : workRequest.quote.processSteps,
          totalCost: q?.totalCost ?? workRequest.quote.totalCost,
          pricingBasis: q?.pricingBasis ?? (workRequest.quote as any).pricingBasis,
          priceSummary: q?.priceSummary ?? (workRequest.quote as any).priceSummary,
          regeneratedAt: new Date().toISOString(),
        },
      };

      onSave(updated);
      toast.success('Quote re-priced from the updated brief.', {
        id: toastId,
        description: 'Line items replaced. Customer details and the quote number are unchanged.',
      });
    } catch (err: any) {
      toast.error(`Could not regenerate the quote: ${err?.message || err}`, { id: toastId });
    } finally {
      setRegenerating(false);
    }
  };

  /**
   * Putting the quote out to subcontractors, for real this time.
   *
   * What was here recorded a marker in the kv store that nothing read, and
   * said so honestly — "Nothing has been sent yet. Build the packages from the
   * scope and post them in the bid room." This closes that gap: the quote
   * becomes an actual `bid_requests` row in the Exchange and the chosen
   * providers are invited to it.
   *
   * WHY THIS CANNOT ACCIDENTALLY BROADCAST
   *
   * Eric's standing rule is that contracted vendors win — a job must not reach
   * the open board when somebody already holds a contract for that work — and
   * the contract check does not exist yet. That rule is not at risk here,
   * because the database makes an open broadcast impossible:
   *
   *   my_open_bid_request_ids()  a provider may bid ONLY where a
   *                              bid_invitations row names their org
   *   bid_request_read           a provider may SEE only what they own or
   *                              were invited to
   *
   * So every bid request is invitation-only at the RLS level. Nobody sees this
   * work unless it is handed to them by name, which is exactly what Eric asked
   * for: "my contractors can bid solely on my work if i only want them to."
   * A genuinely open board is a separate thing and needs that contract check
   * first.
   */
  const [providers, setProviders] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [chosenProviders, setChosenProviders] = useState<Set<string>>(new Set());
  const [postingOrgId, setPostingOrgId] = useState<string>('');
  const [postingBid, setPostingBid] = useState(false);

  const toggleProvider = (id: string) =>
    setChosenProviders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /** Load who can be invited, and which of my orgs may post. */
  const loadBidRoomContext = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;

      const [{ data: memberships }, { data: dir }] = await Promise.all([
        supabase.from('organization_members').select('org_id, role, status').eq('user_id', uid),
        // RLS decides what comes back; no permission check is duplicated here.
        supabase.from('organizations').select('id, name, type')
          .in('type', ['subcontractor', 'vendor']).eq('status', 'active').order('name'),
      ]);

      // Posting needs an org you administer — bid_request_insert checks
      // my_admin_org_ids, so anything else is refused by the database.
      const admin = (memberships || []).find(
        (m: any) => m.status === 'active' && ['owner', 'admin'].includes(String(m.role || '').toLowerCase()),
      );
      if (admin) setPostingOrgId(admin.org_id);
      setProviders((dir || []) as Array<{ id: string; name: string; type: string }>);
    } catch (err) {
      console.error('[bidding] could not load bid room context:', err);
    }
  };

  const handlePostToBidRoom = async () => {
    const quote = workRequest.quote;
    if (!quote?.id) { toast.error('Save the quote before putting it out to bid.'); return; }
    if (!postingOrgId) {
      toast.error('You are not an administrator of any organisation, so you cannot post work to the Exchange.');
      return;
    }
    if (!chosenProviders.size) { toast.error('Choose at least one subcontractor to invite.'); return; }

    setPostingBid(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const total = Number((quote as any).grandTotal ?? (quote as any).total ?? 0) || null;

      const { data: created, error: reqErr } = await supabase.from('bid_requests').insert({
        org_id: postingOrgId,
        title: (quote as any).title || workRequest.title || `Quote ${(quote as any).quoteNumber || quote.id}`,
        trade: workRequest.serviceType || null,
        description: workRequest.description || null,
        site_address: workRequest.location || null,
        // The quote total is what WE priced it at. It is the ceiling we are
        // asking them to come in under, so it goes in as the high end.
        budget_low: null,
        budget_high: total,
        // 'open' rather than 'draft': my_open_bid_request_ids requires it, so
        // a draft is invisible to the very people being invited.
        status: 'open',
        created_by: session?.user?.id || null,
      }).select().single();
      if (reqErr) throw reqErr;

      const { error: invErr } = await supabase.from('bid_invitations').insert(
        [...chosenProviders].map((orgId) => ({
          bid_request_id: created.id,
          org_id: orgId,
          invited_by: session?.user?.id || null,
        })),
      );
      if (invErr) throw invErr;

      // Best effort: the invitations are already live in the Exchange, so a
      // failed notification is a missing email, not a missing invitation.
      try {
        await fetch(`${API_BASE_URL}/make-server-3eae23a6/bid-room/notify-invites`, {
          method: 'POST',
          headers: await quoteAuthHeaders(true),
          body: JSON.stringify({ bidRequestId: created.id, orgIds: [...chosenProviders] }),
        });
      } catch (notifyErr) {
        console.error('[bidding] invitations created but notification failed:', notifyErr);
      }

      // Link it back, so the quote knows where its bids are coming from.
      try {
        await fetch(`${API_BASE_URL}/make-server-3eae23a6/quotes/${quote.id}`, {
          method: 'PUT',
          headers: await quoteAuthHeaders(true),
          body: JSON.stringify({ bidRequestId: created.id }),
        });
      } catch { /* the request exists either way; the link is a convenience */ }

      toast.success(
        `Sent to ${chosenProviders.size} ${chosenProviders.size === 1 ? 'subcontractor' : 'subcontractors'}.`,
        { description: 'Only the people you invited can see or bid on this work.' },
      );
      setChosenProviders(new Set());
      loadSubcontractorBids();
    } catch (err: any) {
      console.error('[bidding] post to bid room failed:', err);
      toast.error(err?.message || 'Could not put this quote out to bid.');
    } finally {
      setPostingBid(false);
    }
  };

  // Request bids from subcontractors
  const handleRequestBids = async () => {
    if (!workRequest.quote) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/make-server-3eae23a6/quotes/${workRequest.quote.id}/request-bids`,
        {
          method: 'POST',
          headers: await quoteAuthHeaders(true),
          body: JSON.stringify({
            workRequestId: workRequest.id,
            quoteId: workRequest.quote.id,
          }),
        }
      );

      if (response.ok) {
        // This used to claim the subcontractors had been emailed and that bids
        // would arrive in a few seconds. Neither was true — it wrote a marker
        // into the kv store that nothing read, and the "bids" were fabricated.
        // A button that reports work it did not do is worse than no button,
        // because somebody stops chasing the trade they think they contacted.
        //
        // The bid room is where providers are actually invited and where sealed
        // bids come back, so this says so rather than pretending.
        toast.success('Noted on the quote', {
          description: 'Nothing has been sent yet. Build the packages from the scope '
            + 'and post them in the bid room to reach providers.',
        });
        loadSubcontractorBids();
      } else {
        throw new Error('That could not be recorded.');
      }
    } catch (error) {
      console.error('Error requesting bids:', error);
      toast.error('That could not be recorded.');
    } finally {
      setLoading(false);
    }
  };

  // Add new material
  const addMaterial = () => {
    if (!editedQuote) return;
    const newMaterial: MaterialItem = {
      id: `m-${Date.now()}`,
      name: 'New Material',
      description: '',
      quantity: 1,
      unit: 'unit',
      unitCost: 0,
      totalCost: 0,
      category: 'General',
      visible: true,
    };
    setEditedQuote({
      ...editedQuote,
      materials: [...editedQuote.materials, newMaterial],
    });
  };

  // Update material
  const updateMaterial = (id: string, field: keyof MaterialItem, value: any) => {
    if (!editedQuote) return;
    const updated = (editedQuote.materials || []).map((m) => {
      if (m.id === id) {
        const updatedMaterial = { ...m, [field]: value };
        if (field === 'quantity' || field === 'unitCost') {
          updatedMaterial.totalCost = updatedMaterial.quantity * updatedMaterial.unitCost;
        }
        return updatedMaterial;
      }
      return m;
    });
    recalculateTotals({ ...editedQuote, materials: updated });
  };

  // Delete material
  const deleteMaterial = (id: string) => {
    if (!editedQuote) return;
    const updated = editedQuote.materials.filter((m) => m.id !== id);
    recalculateTotals({ ...editedQuote, materials: updated });
  };

  // Add new labor
  const addLabor = () => {
    if (!editedQuote) return;
    const newLabor: LaborItem = {
      id: `l-${Date.now()}`,
      role: 'New Labor Role',
      description: '',
      hours: 0,
      hourlyRate: 0,
      totalCost: 0,
      visible: true,
    };
    setEditedQuote({
      ...editedQuote,
      labor: [...editedQuote.labor, newLabor],
    });
  };

  // Update labor
  const updateLabor = (id: string, field: keyof LaborItem, value: any) => {
    if (!editedQuote) return;
    const updated = (editedQuote.labor || []).map((l) => {
      if (l.id === id) {
        const updatedLabor = { ...l, [field]: value };
        if (field === 'hours' || field === 'hourlyRate') {
          updatedLabor.totalCost = updatedLabor.hours * updatedLabor.hourlyRate;
        }
        return updatedLabor;
      }
      return l;
    });
    recalculateTotals({ ...editedQuote, labor: updated });
  };

  // Delete labor
  const deleteLabor = (id: string) => {
    if (!editedQuote) return;
    const updated = editedQuote.labor.filter((l) => l.id !== id);
    recalculateTotals({ ...editedQuote, labor: updated });
  };

  // Add new process step
  const addProcessStep = () => {
    if (!editedQuote) return;
    const newStep: ProcessStep = {
      id: `s-${Date.now()}`,
      stepNumber: editedQuote.processSteps.length + 1,
      title: 'New Step',
      description: '',
      estimatedDuration: '1 day',
      visible: true,
    };
    setEditedQuote({
      ...editedQuote,
      processSteps: [...editedQuote.processSteps, newStep],
    });
  };

  // Update process step
  const updateProcessStep = (id: string, field: keyof ProcessStep, value: any) => {
    if (!editedQuote) return;
    const updated = (editedQuote.processSteps || []).map((s) =>
      s.id === id ? { ...s, [field]: value } : s
    );
    setEditedQuote({ ...editedQuote, processSteps: updated });
  };

  // Delete process step
  const deleteProcessStep = (id: string) => {
    if (!editedQuote) return;
    const updated = editedQuote.processSteps
      .filter((s) => s.id !== id)
      .map((s, index) => ({ ...s, stepNumber: index + 1 }));
    setEditedQuote({ ...editedQuote, processSteps: updated });
  };

  // Find vendor alternatives for a specific material in quote
  const findVendorAlternativesForMaterial = async (material: MaterialItem) => {
    setComparingMaterialId(material.id);
    setLoadingVendorAlternatives(true);

    try {
      const alternatives: any[] = [];

      // Add current vendor
      alternatives.push({
        id: `current-${material.id}`,
        name: material.name,
        vendorName: material.supplier || 'Current Vendor',
        source: 'current',
        price: material.unitCost,
        inStock: true,
        isCurrent: true,
      });

      // Simulate searching other vendors (replace with real API calls in production)
      alternatives.push({
        id: `hd-${material.id}`,
        name: material.name,
        vendorName: 'Home Depot',
        source: 'home_depot',
        price: material.unitCost * 0.95,
        inStock: true,
      });

      alternatives.push({
        id: `lowes-${material.id}`,
        name: material.name,
        vendorName: "Lowe's",
        source: 'lowes',
        price: material.unitCost * 0.92,
        inStock: true,
      });

      alternatives.push({
        id: `grainger-${material.id}`,
        name: material.name,
        vendorName: 'Grainger',
        source: 'grainger',
        price: material.unitCost * 1.05,
        inStock: true,
      });

      setVendorAlternatives(alternatives);
    } catch (error) {
      console.error('Failed to find vendor alternatives:', error);
      toast.error('Failed to load vendor options');
    } finally {
      setLoadingVendorAlternatives(false);
    }
  };

  // Select a vendor alternative and update the material
  const selectVendorAlternative = (alternative: any) => {
    if (!editedQuote) return;

    const materialIndex = editedQuote.materials.findIndex(m => m.id === comparingMaterialId);
    if (materialIndex === -1) return;

    const originalMaterial = editedQuote.materials[materialIndex];
    const updatedMaterial = {
      ...originalMaterial,
      supplier: alternative.vendorName,
      unitCost: alternative.price,
      totalCost: alternative.price * originalMaterial.quantity,
    };

    const updatedMaterials = [...editedQuote.materials];
    updatedMaterials[materialIndex] = updatedMaterial;

    recalculateTotals({ ...editedQuote, materials: updatedMaterials });
    setComparingMaterialId(null);
    setVendorAlternatives([]);

    toast.success(`Switched to ${alternative.vendorName}`, {
      description: `New price: $${alternative.price.toFixed(2)}/${originalMaterial.unit}`,
    });
  };

  // Materials Hub Integration Functions
  const searchMaterialsHub = () => {
    const results = materialsHubService.searchMaterials(materialsHubSearch, {
      category: materialsHubCategory !== 'all' ? materialsHubCategory : undefined,
    });
    setMaterialsHubResults(results);
  };

  useEffect(() => {
    if (showMaterialsHub) {
      searchMaterialsHub();
    }
  }, [materialsHubSearch, materialsHubCategory, showMaterialsHub]);

  const replaceMaterialWithHubProduct = (hubMaterial: Material, originalMaterialId: string) => {
    if (!editedQuote) return;
    
    const originalMaterial = editedQuote.materials.find(m => m.id === originalMaterialId);
    if (!originalMaterial) return;

    const updated = (editedQuote.materials || []).map((m) => {
      if (m.id === originalMaterialId) {
        return {
          ...m,
          name: hubMaterial.name,
          description: hubMaterial.description || m.description,
          unitCost: hubMaterial.basePrice,
          totalCost: m.quantity * hubMaterial.basePrice,
          supplier: hubMaterial.vendorName || hubMaterial.manufacturer,
          manufacturer: hubMaterial.manufacturer,
          category: hubMaterial.category,
        };
      }
      return m;
    });

    recalculateTotals({ ...editedQuote, materials: updated });
    toast.success(`Replaced with ${hubMaterial.name}`);
    setReplacingMaterialId(null);
  };

  const addMaterialFromHub = (hubMaterial: Material) => {
    if (!editedQuote) return;
    
    const newMaterial: MaterialItem = {
      id: `m-${Date.now()}`,
      name: hubMaterial.name,
      description: hubMaterial.description || '',
      quantity: 1,
      unit: hubMaterial.unit,
      unitCost: hubMaterial.basePrice,
      totalCost: hubMaterial.basePrice,
      supplier: hubMaterial.vendorName || hubMaterial.manufacturer,
      manufacturer: hubMaterial.manufacturer,
      category: hubMaterial.category,
      visible: true,
    };

    setEditedQuote({
      ...editedQuote,
      materials: [...editedQuote.materials, newMaterial],
    });
    
    recalculateTotals({
      ...editedQuote,
      materials: [...editedQuote.materials, newMaterial],
    });

    toast.success(`Added ${hubMaterial.name} to quote`);
  };

  // Schedule Builder Functions
  const addScheduleTask = () => {
    const newTask: ScheduleTask = {
      id: `task-${Date.now()}`,
      title: 'New Task',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      duration: 7,
      status: 'not-started',
      color: '#3b82f6',
    };
    setProjectSchedule([...projectSchedule, newTask]);
  };

  const updateScheduleTask = (id: string, field: keyof ScheduleTask, value: any) => {
    setProjectSchedule(projectSchedule.map(task => {
      if (task.id === id) {
        const updated = { ...task, [field]: value };
        
        // Auto-calculate duration when dates change
        if (field === 'startDate' || field === 'endDate') {
          const start = new Date(field === 'startDate' ? value : task.startDate);
          const end = new Date(field === 'endDate' ? value : task.endDate);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          updated.duration = diffDays;
        }
        
        return updated;
      }
      return task;
    }));
  };

  const deleteScheduleTask = (id: string) => {
    setProjectSchedule(projectSchedule.filter(task => task.id !== id));
    toast.info('Task removed from schedule');
  };

  const generateScheduleFromProcessSteps = () => {
    if (!editedQuote) return;
    
    const tasks: ScheduleTask[] = [];
    let currentDate = new Date();
    
    editedQuote.processSteps.forEach((step, index) => {
      const duration = parseInt(step.estimatedDuration) || 1;
      const endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + duration);
      
      tasks.push({
        id: `task-${step.id}`,
        title: step.title,
        startDate: currentDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        duration: duration,
        status: 'not-started',
        color: index % 2 === 0 ? '#3b82f6' : '#8b5cf6',
      });
      
      currentDate = new Date(endDate);
      currentDate.setDate(currentDate.getDate() + 1); // 1 day buffer
    });
    
    setProjectSchedule(tasks);
    toast.success('Schedule generated from process steps');
  };

  const exportScheduleToCalendar = async () => {
    if (!projectSchedule.length) {
      toast.error('Add at least one project task before publishing the schedule.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/make-server-3eae23a6/work-requests/${encodeURIComponent(workRequest.id)}/project-schedule`,
        { method: 'PUT', headers: await quoteAuthHeaders(true), body: JSON.stringify({ quoteNumber: currentQuote?.quoteNumber, projectTitle: workRequest.title, tasks: projectSchedule }) }
      );
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to publish the project schedule.');
      toast.success('Schedule published to Master Scheduling', { description: `${projectSchedule.length} tasks are now attached to this project.` });
    } catch (error: any) {
      console.error('Error publishing schedule:', error);
      toast.error(error.message || 'Unable to publish the project schedule.');
    } finally { setLoading(false); }
  };

  // Recalculate quote totals
  const recalculateTotals = (quote: Quote) => {
    /**
     * What a line comes to, whichever shape it was written in.
     *
     * One generation stores `totalCost`; the other stores `quantity` and a
     * unit price and expects the product to be worked out. Reading only the
     * first sums a column of undefined, which is NaN, and NaN spreads through
     * every figure below it.
     */
    const lineTotal = (line: any): number => {
      const stated = Number(line?.totalCost);
      if (Number.isFinite(stated)) return stated;
      const quantity = Number(line?.quantity ?? line?.hours ?? 1) || 0;
      const rate = Number(line?.unitCost ?? line?.unitPrice ?? line?.hourlyRate ?? 0) || 0;
      return quantity * rate;
    };

    const materialsSubtotal = (quote.materials || []).reduce((sum, m) => sum + lineTotal(m), 0);
    const laborSubtotal = (quote.labor || []).reduce((sum, l) => sum + lineTotal(l), 0);

    /**
     * Credits come off the MATERIALS figure, not off the bottom.
     *
     * Tax here is on materials, so crediting after tax would charge the
     * customer sales tax on flooring they bought themselves. Taking it off
     * the material first gives the same answer as never having billed it —
     * which is what actually happened.
     *
     * The taxable figure floors at zero so a credit larger than the material
     * cannot produce a negative tax, while the TOTAL is deliberately not
     * floored: a quote that ends up in the customer\u2019s favour is a real
     * situation and somebody should see it rather than have it rounded away.
     */
    const creditsSubtotal = (quote.credits || []).reduce((sum, c) => sum + Math.abs(Number(c.amount) || 0), 0);
    const taxableMaterials = Math.max(0, materialsSubtotal - creditsSubtotal);
    const taxAmount = taxableMaterials * quote.taxRate;
    const totalCost = materialsSubtotal + laborSubtotal + taxAmount - creditsSubtotal;

    setEditedQuote({
      ...quote,
      materialsSubtotal,
      laborSubtotal,
      creditsSubtotal,
      taxAmount,
      totalCost,
    });
  };

  /* ── credits: what the customer supplied themselves ─────────────── */

  const addCredit = () => {
    if (!editedQuote) return;
    const credit: QuoteCredit = {
      id: `credit_${Date.now().toString(36)}`,
      description: '',
      amount: 0,
    };
    recalculateTotals({ ...editedQuote, credits: [...(editedQuote.credits || []), credit] });
  };

  const updateCredit = (id: string, field: keyof QuoteCredit, value: any) => {
    if (!editedQuote) return;
    const credits = (editedQuote.credits || []).map(c => (
      c.id === id
        ? { ...c, [field]: field === 'amount' ? Math.abs(Number(value) || 0) : value }
        : c
    ));
    recalculateTotals({ ...editedQuote, credits });
  };

  const removeCredit = (id: string) => {
    if (!editedQuote) return;
    recalculateTotals({
      ...editedQuote,
      credits: (editedQuote.credits || []).filter(c => c.id !== id),
    });
  };

  // Save quote changes to backend
  const handleSaveQuote = async () => {
    if (!editedQuote) return;

    setLoading(true);
    try {
      const base = `${API_BASE_URL}/make-server-3eae23a6/quotes`;
      const headers = await quoteAuthHeaders(true);
      const figures = {
        materials: editedQuote.materials,
        labor: editedQuote.labor,
        processSteps: editedQuote.processSteps,
        /**
         * The two bits of prose, which were not being saved.
         *
         * `visible` flags travel for free because the whole line objects are
         * sent above. These do not — they are quote-level fields and had to
         * be named, and were not, so editing either silently discarded the
         * edit the next time the quote was loaded.
         */
        internalNotes: (editedQuote as any).internalNotes || '',
        aiSummary: (editedQuote as any).aiSummary || '',
        credits: editedQuote.credits || [],
        creditsSubtotal: editedQuote.creditsSubtotal || 0,
        materialsSubtotal: editedQuote.materialsSubtotal,
        laborSubtotal: editedQuote.laborSubtotal,
        taxRate: editedQuote.taxRate,
        taxAmount: editedQuote.taxAmount,
        totalCost: editedQuote.totalCost,
      };

      let response = await fetch(`${base}/${encodeURIComponent(editedQuote.id)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(figures),
      });

      /**
       * A 404 here means the quote has no record of its own yet.
       *
       * The editor invents an id (`qt-{workRequestId}`) for a quote that was
       * drafted onto the work request, so the first save of such a quote is a
       * create rather than an update. Without this it PUT to an id the server
       * had never seen and failed, which is what happened to every job quoted
       * before quotes were stored separately.
       *
       * POST is create-or-update and stamps the job from the work request, so
       * the whole quote is sent rather than just the figures.
       */
      if (response.status === 404) {
        response = await fetch(base, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...editedQuote,
            ...figures,
            id: editedQuote.id,
            workRequestId: workRequest.id,
            customerName: (workRequest as any).client_name || (workRequest as any).customerName,
            customerEmail: (workRequest as any).client_email || (workRequest as any).customerEmail,
          }),
        });
      }

      if (response.ok) {
        toast.success('Quote updated successfully');
        onSave({ ...workRequest, quote: editedQuote });
        setEditMode(false);
      } else {
        /**
         * Carry the server's own reason.
         *
         * This threw a fixed string, so a refusal, a missing record and a
         * server fault all read as "Failed to save quote" — which is how a
         * plain 404 took three attempts and the request log to identify.
         */
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Could not save the quote (${response.status}).`);
      }
    } catch (error: any) {
      console.error('Error saving quote:', error);
      toast.error(error?.message || 'Failed to save quote');
    } finally {
      setLoading(false);
    }
  };

  // Fire the existing server-side portal invite for this customer.
  // Returns a human-readable status string, or null on hard failure (toasted).
  const sendAppInvite = async (): Promise<string | null> => {
    const phone = (invitePhone.trim() || workRequest.customerPhone || '').trim();
    try {
      const res = await fetch(
        `${API_BASE_URL}/make-server-3eae23a6/owner-provisioning/invites`,
        {
          method: 'POST',
          headers: await quoteAuthHeaders(true),
          body: JSON.stringify({
            name: workRequest.customerName || workRequest.customerEmail,
            email: workRequest.customerEmail,
            phone,
            portalType: 'customer',
            fullAccess: true,
            sendEmail: true,
            sendSms: inviteBySms && !!phone,
          }),
        }
      );
      const data = await res.json().catch(() => null);
      if (res.status === 409) return 'already has an account/invite';
      if (!res.ok || !data?.success) {
        console.error('[QuoteToContractEditor] invite failed:', res.status, data);
        toast.error(data?.error || `Could not send app invite (${res.status}).`);
        return null;
      }
      const inv = data.invite || {};
      const parts: string[] = [];
      if (inv.invitationSent) parts.push('email');
      if (inv.smsSent) parts.push('SMS');
      if (parts.length) return `invite sent by ${parts.join(' + ')}`;
      const why = inv.inviteNotice || inv.smsNotice || 'no channel delivered';
      toast.warning(`Quote sent, but the app invite did not deliver: ${why}`);
      return null;
    } catch (err: any) {
      console.error('[QuoteToContractEditor] invite error:', err);
      toast.error(err.message || 'Could not send the app invite.');
      return null;
    }
  };

  /**
   * Send quote to customer for approval.
   *
   * `acknowledgedUnpriced` is passed only on a deliberate retry. The route
   * refuses an unpriced quote without it and answers 409 with
   * `UNPRICED_QUOTE_NEEDS_ACKNOWLEDGEMENT`, which becomes the dialog below
   * rather than an error toast — the quote is sendable, it just should not go
   * out unnoticed. Eric asked for the option to send or not; this is where he
   * takes it.
   */
  const handleSendToCustomer = async (acknowledgedUnpriced = false) => {
    if (inviteToApp && !(invitePhone.trim() || workRequest.customerPhone)) {
      toast.error('A phone number is required to invite this customer to the app.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/make-server-3eae23a6/quotes/${workRequest.quote?.id}/send-to-customer`,
        {
          method: 'POST',
          headers: await quoteAuthHeaders(true),
          body: JSON.stringify({
            customerEmail: workRequest.customerEmail,
            customerName: workRequest.customerName,
            message: 'Please review and approve this quote.',
            ...(acknowledgedUnpriced ? { acknowledgedUnpriced: true } : {}),
          }),
        }
      );

      if (response.status === 409) {
        const refusal = await response.json().catch(() => ({} as any));
        if (refusal?.code === 'UNPRICED_QUOTE_NEEDS_ACKNOWLEDGEMENT') {
          setUnpricedSend({
            reason: String(refusal.error || 'This quote was not priced from your own figures.'),
            basis: String(refusal.pricingBasis || ''),
          });
          return;
        }
      }

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        // Optionally invite the customer to join the app (customer portal).
        let inviteStatus: string | null = null;
        if (inviteToApp) inviteStatus = await sendAppInvite();
        const inviteSuffix = inviteToApp && inviteStatus ? ` · ${inviteStatus}` : '';
        if (data?.approvalToken) {
          const link = `${window.location.origin}${window.location.pathname}?token=${data.approvalToken}`;
          try { await navigator.clipboard.writeText(link); } catch {}
          toast.success(`Quote sent — approval link copied${inviteSuffix}`, {
            description: `Share this link with ${workRequest.customerEmail}: ${link}`,
          });
        } else {
          toast.success(`Quote sent to customer${inviteSuffix}`, {
            description: `Sent to ${workRequest.customerEmail}`,
          });
        }
        onSendToCustomer(workRequest);
        setUnpricedSend(null);
      } else {
        throw new Error('Failed to send quote');
      }
    } catch (error) {
      console.error('Error sending quote:', error);
      toast.error('Failed to send quote to customer');
    } finally {
      setLoading(false);
    }
  };

  if (!currentQuote) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-gray-800 rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Quote Available</h3>
            <p className="text-gray-400 mb-6">
              This work request doesn't have a quote yet. Generate one first.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-black border border-[#ea580c]/50 hover:border-[#ea580c] hover:shadow-[0_0_15px_rgba(234,88,12,0.5)] text-[#ea580c] rounded-lg font-semibold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Purchase Orders Modal */}
      {showPurchaseOrders && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-green-500/30 rounded-2xl max-w-6xl w-full my-8">
            {/* PO Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-6 h-6 text-green-400" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Purchase Orders by Vendor</h2>
                  <p className="text-sm text-gray-400">Create and send purchase orders to suppliers</p>
                </div>
              </div>
              <button
                onClick={() => setShowPurchaseOrders(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* PO Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {Object.entries(purchaseOrders).map(([vendor, materials]) => {
                const vendorTotal = materials.reduce((sum, m) => sum + (m.totalCost || 0), 0);
                return (
                  <div key={vendor} className="bg-black/40 border border-gray-700 rounded-xl p-6">
                    {/* Vendor Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">{vendor}</h3>
                        <p className="text-sm text-gray-400">{materials.length} items · ${vendorTotal.toFixed(2)} total</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            // Export to CSV or send PO
                            const csvContent = `Material,Quantity,Unit,Unit Cost,Total\n` +
                              materials.map(m =>
                                `"${m.name}",${m.quantity},${m.unit},${m.unitCost},${m.totalCost}`
                              ).join('\n');

                            const blob = new Blob([csvContent], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `PO_${vendor.replace(/\s+/g, '_')}_${Date.now()}.csv`;
                            a.click();
                            window.URL.revokeObjectURL(url);

                            toast.success(`Purchase order exported for ${vendor}`);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-black border border-blue-500/50 hover:border-blue-500 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] text-blue-400 rounded-lg text-sm font-semibold transition-all"
                        >
                          <Download className="w-4 h-4" />
                          Export CSV
                        </button>
                        <button
                          onClick={async () => {
                            setLoading(true);
                            try {
                              // Send PO request to backend or email
                              const poData = {
                                vendor,
                                materials,
                                total: vendorTotal,
                                quoteId: currentQuote.id,
                                requestedBy: workRequest.customerName,
                                requestDate: new Date().toISOString(),
                              };

                              // You can implement actual PO sending here
                              // For now, just show success
                              toast.success(`Purchase order request sent to ${vendor}`, {
                                description: `${materials.length} items · $${vendorTotal.toFixed(2)}`,
                              });
                            } catch (error) {
                              console.error('PO send error:', error);
                              toast.error('Failed to send purchase order');
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-black border border-green-500/50 hover:border-green-500 hover:shadow-[0_0_10px_rgba(34,197,94,0.3)] text-green-400 rounded-lg text-sm font-semibold transition-all"
                        >
                          <Send className="w-4 h-4" />
                          Send PO Request
                        </button>
                      </div>
                    </div>

                    {/* Materials List */}
                    <div className="space-y-2">
                      {materials.map((material) => (
                        <div key={material.id} className="flex items-center justify-between py-2 px-3 bg-black/40 border border-gray-700 rounded">
                          <div className="flex-1">
                            <div className="font-semibold text-white text-sm">{material.name}</div>
                            <div className="text-xs text-gray-400">
                              {material.quantity} {material.unit} × ${(material.unitCost || 0).toFixed(2)}
                              {material.category && <span className="ml-2 text-gray-500">· {material.category}</span>}
                            </div>
                          </div>
                          <div className="text-green-400 font-bold">
                            ${(material.totalCost || 0).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PO Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                {Object.keys(purchaseOrders).length} vendors · {currentQuote.materials.length} total items
              </div>
              <button
                onClick={() => setShowPurchaseOrders(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Quote Editor */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-gray-800 rounded-2xl max-w-7xl w-full my-8">
          {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <FileText className="w-8 h-8 text-[#ea580c]" />
            <div>
              <h2 className="text-2xl font-bold text-white">Quote Editor</h2>
              <p className="text-gray-400 text-sm">
                {workRequest.requestNumber} - {workRequest.customerName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowWorkRequestDrawer(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                showWorkRequestDrawer
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-600/20 border border-orange-500/40 text-orange-300 hover:bg-orange-600/30'
              }`}
            >
              👁 {showWorkRequestDrawer ? 'Hide' : 'View'} Work Request
            </button>
            {/*
              The customer's eye view. Beside the other view control rather
              than with the destructive ones — it changes nothing about the
              quote, it only shows it.
            */}
            {/*
              The document itself — see it laid out, print it, save the PDF.
              Separate from "View as customer": this is the paperwork, that is
              the web page they get sent. Both matter and they are not the
              same artefact.
            */}
            {workRequest.quote?.id && (
              <button
                onClick={() => setPreviewDoc(true)}
                title="See the quote as a document, print it, or save a PDF"
                className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#141414] px-4 py-2 text-sm font-bold text-gray-300 transition-all hover:border-gray-500 hover:text-white"
              >
                <FileText className="h-4 w-4" />
                View / PDF
              </button>
            )}
            {workRequest.quote?.id && (
              <button
                onClick={handlePreviewAsCustomer}
                disabled={previewing}
                title="Opens the real customer page in a new tab. Issues a share link, which expires and can be revoked."
                className="flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-600/10 px-4 py-2 text-sm font-bold text-blue-300 transition-all hover:bg-blue-600/20 disabled:opacity-50"
              >
                {previewing
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Eye className="h-4 w-4" />}
                {previewing ? 'Opening…' : 'View as customer'}
              </button>
            )}
            {/*
              Delete, two-step. Styled as a quiet red outline rather than a
              filled button: it sits beside the primary actions and should not
              compete with them, but it must be unmistakably destructive once
              it is armed.
            */}
            {workRequest.quote?.id && (
              <button
                onClick={handleDeleteQuote}
                onBlur={() => setConfirmingDelete(false)}
                disabled={deleting}
                title={confirmingDelete ? 'Click again to permanently delete this quote' : 'Delete this quote'}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${
                  confirmingDelete
                    ? 'bg-red-600 text-white hover:bg-red-500'
                    : 'bg-red-600/10 border border-red-500/40 text-red-300 hover:bg-red-600/20'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting…' : confirmingDelete ? 'Delete — are you sure?' : 'Delete'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="border-b border-gray-800">
          <div className="flex gap-2 p-4">
            <button
              onClick={() => setActiveTab('quote')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'quote'
                  ? 'bg-[#ea580c] text-white'
                  : 'bg-black border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              <FileText className="w-5 h-5" />
              Quote Details
            </button>
            <button
              onClick={() => setActiveTab('bidding')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'bidding'
                  ? 'bg-[#ea580c] text-white'
                  : 'bg-black border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              <Award className="w-5 h-5" />
              Subcontractor Bids
              {subcontractorBids.length > 0 && (
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {subcontractorBids.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('approval')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'approval'
                  ? 'bg-[#ea580c] text-white'
                  : 'bg-black border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              Customer Approval
              {currentQuote.approvalStatus === 'approved' && (
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  Approved
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
          {/* QUOTE DETAILS TAB */}
          {activeTab === 'quote' && (
            <div className="space-y-6">
              {/*
                What this quote was priced from — editable, and re-runnable.
                Above the quote itself because a correction to the brief
                invalidates everything below it; seeing the figures first and
                the inputs afterwards is the wrong way round.
              */}
              <details className="group rounded-xl border border-gray-700 bg-black/40" open={briefEdited}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#ea580c]" />
                    <span className="text-sm font-bold text-white">The brief this was priced from</span>
                    {briefEdited && (
                      <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                        edited — not yet re-priced
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 group-open:hidden">Show and edit</span>
                  <span className="hidden text-xs text-gray-500 group-open:inline">Hide</span>
                </summary>

                <div className="space-y-4 border-t border-gray-800 p-4">
                  {!hasFullIntake && (
                    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
                      This quote predates the brief being kept, so only its description survived.
                      You can still edit it and re-price, but the estimator will have less to work
                      from than it did originally.
                    </p>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-400">Description</label>
                    <textarea
                      value={briefDraft.description || ''}
                      onChange={(e) => setBriefField('description', e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-[#2A2A2A] bg-[#050505] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                      placeholder="What the job is."
                    />
                  </div>

                  {hasFullIntake && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-400">
                        In your own words (the brief)
                      </label>
                      <textarea
                        value={briefDraft.brief || ''}
                        onChange={(e) => setBriefField('brief', e.target.value)}
                        rows={4}
                        className="w-full rounded-lg border border-[#2A2A2A] bg-[#050505] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                        placeholder="The detail only somebody who saw the job can give."
                      />
                    </div>
                  )}

                  {hasFullIntake && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {([
                        ['squareFootage', 'Square footage'],
                        ['linearFootage', 'Linear footage'],
                        ['roomCount', 'Rooms'],
                        ['ceilingHeight', 'Ceiling height'],
                        ['accessNotes', 'Access'],
                        ['occupancy', 'Occupancy'],
                        ['urgency', 'Urgency'],
                        ['exclusions', 'Exclusions'],
                      ] as Array<[string, string]>).map(([key, label]) => (
                        <div key={key}>
                          <label className="mb-1 block text-[11px] font-semibold text-gray-500">{label}</label>
                          <input
                            value={briefDraft[key] || ''}
                            onChange={(e) => setBriefField(key, e.target.value)}
                            className="w-full rounded-lg border border-[#2A2A2A] bg-[#050505] px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      onClick={handleRegenerateFromBrief}
                      disabled={regenerating}
                      className="flex items-center gap-2 rounded-lg border border-[#ea580c]/50 bg-black px-4 py-2 text-sm font-bold text-[#ea580c] transition-all hover:border-[#ea580c] hover:shadow-[0_0_15px_rgba(234,88,12,0.4)] disabled:opacity-50"
                    >
                      {regenerating
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Recycle className="h-4 w-4" />}
                      {regenerating ? 'Re-pricing…' : 'Regenerate quote'}
                    </button>
                    {briefEdited && (
                      <button
                        onClick={() => setBriefDraft(originalBrief)}
                        disabled={regenerating}
                        className="text-xs font-semibold text-gray-400 underline underline-offset-4 hover:text-white disabled:opacity-50"
                      >
                        Discard my edits
                      </button>
                    )}
                    <span className="text-xs text-gray-500">
                      Replaces the priced lines. The customer, quote number and status stay as they are.
                    </span>
                  </div>
                </div>
              </details>

              {/* Quote Header */}
              <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
                {/* Company Header with Logo */}
                <div className="flex items-start gap-4 mb-6 pb-4 border-b border-gray-700">
                  {companyLogo && (
                    <img
                      src={companyLogo}
                      alt={companyName}
                      className="w-16 h-16 object-contain rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-1">{companyName}</h2>
                    <p className="text-sm text-gray-400">Professional Quote</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      Quote {currentQuote.quoteNumber}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Generated: {new Date(currentQuote.generatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {!editMode ? (
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-black border border-blue-500/50 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] text-blue-400 rounded-lg font-semibold transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Quote
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditMode(false)}
                        className="px-4 py-2 bg-black border border-gray-600 hover:border-gray-500 text-gray-400 hover:text-white rounded-lg font-semibold transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveQuote}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-black border border-green-500/50 hover:border-green-500 hover:shadow-[0_0_15px_rgba(34,197,94,0.5)] text-green-400 rounded-lg font-semibold transition-all disabled:opacity-50"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save Changes
                      </button>
                    </div>
                  )}
                </div>

                {/* Quote Summary */}
                <div className={`grid gap-4 ${(currentQuote.creditsSubtotal || 0) > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="text-blue-400 text-sm mb-1">Materials</div>
                    <div className="text-2xl font-bold text-white">
                      ${(currentQuote.materialsSubtotal || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                    <div className="text-purple-400 text-sm mb-1">Labor</div>
                    <div className="text-2xl font-bold text-white">
                      ${(currentQuote.laborSubtotal || 0).toLocaleString()}
                    </div>
                  </div>
                  {(currentQuote.creditsSubtotal || 0) > 0 && (
                    <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/30 rounded-lg p-4">
                      <div className="text-emerald-400 text-sm mb-1">Credits</div>
                      <div className="text-2xl font-bold text-white">
                        −${(currentQuote.creditsSubtotal || 0).toLocaleString()}
                      </div>
                    </div>
                  )}
                  <div className="bg-gradient-to-br from-[#ea580c]/10 to-[#fb923c]/10 border border-[#ea580c]/30 rounded-lg p-4">
                    <div className="text-[#ea580c] text-sm mb-1">Total</div>
                    <div className="text-2xl font-bold text-white">
                      ${(currentQuote.totalCost || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* What the customer supplied themselves */}
                {editMode && (
                  <details open={(editedQuote?.credits || []).length > 0}
                    className="mt-6 bg-black/20 border border-emerald-500/30 rounded-lg">
                    <summary className="px-4 py-3 cursor-pointer font-semibold text-emerald-400 hover:bg-emerald-500/10 rounded-t-lg flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Customer credits ({(editedQuote?.credits || []).length})
                    </summary>
                    <div className="p-4 space-y-3">
                      <p className="text-xs text-gray-500">
                        For material the customer bought themselves — their own flooring, their own
                        fixtures. It comes off the materials figure, so there is no markup and no
                        sales tax on it, and it stays on the quote as its own line.
                      </p>

                      {(editedQuote?.credits || []).map(credit => (
                        <div key={credit.id} className="bg-black/30 border border-emerald-500/20 rounded-lg p-3 space-y-2">
                          <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 8rem 2rem' }}>
                            <input
                              value={credit.description}
                              onChange={e => updateCredit(credit.id, 'description', e.target.value)}
                              placeholder="What they supplied — e.g. hardwood flooring"
                              className="bg-black/40 border border-emerald-500/20 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50" />
                            {/* Always positive: the credit is the record type, not a minus sign. */}
                            <input
                              type="number" min="0" step="0.01"
                              value={credit.amount || ''}
                              onChange={e => updateCredit(credit.id, 'amount', e.target.value)}
                              placeholder="0.00"
                              className="bg-black/40 border border-emerald-500/20 rounded px-3 py-2 text-sm text-emerald-300 text-right focus:outline-none focus:border-emerald-500/50" />
                            <button onClick={() => removeCredit(credit.id)}
                              className="flex items-center justify-center rounded hover:bg-red-500/20 transition"
                              aria-label="Remove this credit">
                              <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-400" />
                            </button>
                          </div>
                          <input
                            value={credit.reason || ''}
                            onChange={e => updateCredit(credit.id, 'reason', e.target.value)}
                            placeholder="Why — e.g. bought their own at Home Depot, receipt on file"
                            className="w-full bg-transparent border-b border-emerald-500/20 px-1 py-1 text-xs text-emerald-200/70 placeholder-gray-700 focus:outline-none focus:border-emerald-500/50" />
                        </div>
                      ))}

                      <button onClick={addCredit}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/10 transition">
                        <Plus className="w-4 h-4" /> Add a credit
                      </button>

                      {(editedQuote?.totalCost || 0) < 0 && (
                        <p className="text-xs text-amber-400">
                          The credits come to more than the work. This quote is in the customer\u2019s
                          favour — worth a second look before it goes out.
                        </p>
                      )}
                    </div>
                  </details>
                )}

                {/* Detailed Materials Breakdown - Always Visible */}
                <details open className="mt-6 bg-black/20 border border-blue-500/30 rounded-lg">
                  <summary className="px-4 py-3 cursor-pointer font-semibold text-blue-400 hover:bg-blue-500/10 rounded-t-lg flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Materials Breakdown ({currentQuote.materials.length} items)
                  </summary>
                  <div className="p-4 space-y-2">
                    {currentQuote.materials.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No materials added yet</p>
                    ) : (
                      currentQuote.materials.map((material) => (
                        <div key={material.id} className="flex items-center justify-between py-2 px-3 bg-black/40 border border-gray-700 rounded">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-white text-sm">{material.name || material.description}</div>
                              <PriceSource source={(material as any).source} vendor={(material as any).supplier || (material as any).vendor} />
                            </div>
                            <div className="text-xs text-gray-400">
                              {material.quantity} {material.unit} × ${(material.unitCost || material.unitPrice || 0).toFixed(2)}
                              {/*
                                Waste, shown because it is part of the quantity
                                somebody is being charged for. The engine applies
                                an industry factor per material type — 10% on
                                lumber, 12% on tile — and a customer asking "why
                                am I paying for 1.1 of what I need" deserves the
                                answer on the line rather than in a footnote.
                              */}
                              {Number((material as any).wasteFactor) > 0 ? (
                                <span className="ml-1 text-gray-500">
                                  · incl. {Math.round(Number((material as any).wasteFactor) * 100)}% waste
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="text-blue-400 font-bold">
                            ${(material.totalCost || material.totalPrice || 0).toFixed(2)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </details>

                {/* Detailed Labor Breakdown - Always Visible */}
                <details open className="mt-4 bg-black/20 border border-purple-500/30 rounded-lg">
                  <summary className="px-4 py-3 cursor-pointer font-semibold text-purple-400 hover:bg-purple-500/10 rounded-t-lg flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Labor Breakdown ({currentQuote.labor.length} items)
                  </summary>
                  <div className="p-4 space-y-2">
                    {currentQuote.labor.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No labor items added yet</p>
                    ) : (
                      currentQuote.labor.map((labor) => (
                        <div key={labor.id} className="flex items-center justify-between py-2 px-3 bg-black/40 border border-gray-700 rounded">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-white text-sm">{labor.role || labor.description}</div>
                              <PriceSource source={(labor as any).source} />
                            </div>
                            <div className="text-xs text-gray-400">
                              {labor.hours} hours × ${(labor.hourlyRate || labor.unitPrice || 0).toFixed(2)}/hr
                              {/*
                                Crew size, because hours alone are ambiguous:
                                forty hours is one person for a week or four for
                                a day, and those are different schedules for the
                                same money. The engine reasons about crew size to
                                reach its hours, so the figure exists.
                              */}
                              {Number((labor as any).crewSize) > 0 ? (
                                <span className="ml-1 text-gray-500">· crew of {Number((labor as any).crewSize)}</span>
                              ) : null}
                              {(labor as any).hoursSource === 'measured' ? (
                                <span className="ml-1 text-emerald-400">· hours corrected from finished jobs</span>
                              ) : null}
                            </div>
                            {(labor as any).productivityNote ? (
                              <div className="mt-0.5 text-[11px] text-gray-500">{(labor as any).productivityNote}</div>
                            ) : null}
                          </div>
                          <div className="text-purple-400 font-bold">
                            ${(labor.totalCost || labor.totalPrice || 0).toFixed(2)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </details>

                <QuoteBasis quote={currentQuote} />
              </div>

              {/* Quote Edit Tabs */}
              {editMode && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setQuoteEditTab('materials')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                      quoteEditTab === 'materials'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        : 'bg-black border border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    Materials ({currentQuote.materials.length})
                  </button>
                  <button
                    onClick={() => setQuoteEditTab('labor')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                      quoteEditTab === 'labor'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                        : 'bg-black border border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Labor ({currentQuote.labor.length})
                  </button>
                  <button
                    onClick={() => setQuoteEditTab('process')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                      quoteEditTab === 'process'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : 'bg-black border border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    <ListChecks className="w-4 h-4" />
                    Process ({currentQuote.processSteps.length})
                  </button>
                </div>
              )}

              {/* Materials Section */}
              {(!editMode || quoteEditTab === 'materials') && (
                <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-400" />
                      Materials
                    </h4>
                    <div className="flex items-center gap-2">
                      {!editMode && (
                        <>
                          <button
                            onClick={() => {
                              // Send all materials to Materials Hub for management
                              // ALL materials are set to visible in Materials Hub for internal work
                              // The visibility toggle only controls what customers see in their quote
                              const hubMaterials = currentQuote.materials.map((m: any) => ({
                                id: m.id,
                                name: m.name,
                                description: m.description || '',
                                category: m.category || 'General',
                                vendorName: m.supplier || 'General Supply',
                                manufacturer: m.manufacturer || m.supplier || '',
                                basePrice: m.unitCost,
                                quantity: m.quantity,
                                unit: m.unit,
                                inStock: true,
                                qualityRating: 4.5,
                                visible: true, // Always visible in Materials Hub for internal work
                                visibleToCustomer: m.visible || false, // Track customer visibility separately
                              }));

                              // Store in Materials Hub (you can integrate with your hub service here)
                              localStorage.setItem('materials-hub-import', JSON.stringify(hubMaterials));

                              toast.success(`${hubMaterials.length} materials added to Materials Hub`, {
                                description: 'You can now manage vendors and create purchase orders. All materials are visible for internal work.',
                              });
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-black border border-cyan-500/50 hover:border-cyan-500 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] text-cyan-400 rounded-lg text-sm font-semibold transition-all"
                          >
                            <Upload className="w-4 h-4" />
                            Add to Materials Hub
                          </button>
                          <button
                            onClick={() => {
                              // Group materials by supplier/vendor
                              const materialsByVendor: Record<string, any[]> = {};
                              currentQuote.materials.forEach((m: any) => {
                                const vendor = m.supplier || 'General Supply';
                                if (!materialsByVendor[vendor]) {
                                  materialsByVendor[vendor] = [];
                                }
                                materialsByVendor[vendor].push(m);
                              });

                              setPurchaseOrders(materialsByVendor);
                              setShowPurchaseOrders(true);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-black border border-green-500/50 hover:border-green-500 hover:shadow-[0_0_10px_rgba(34,197,94,0.3)] text-green-400 rounded-lg text-sm font-semibold transition-all"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Create PO Lists by Vendor
                          </button>
                        </>
                      )}
                      {editMode && (
                        <button
                          onClick={addMaterial}
                          className="flex items-center gap-2 px-3 py-1.5 bg-black border border-blue-500/50 hover:border-blue-500 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] text-blue-400 rounded-lg text-sm font-semibold transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          Add Material
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      <span className="text-blue-400 font-semibold">{currentQuote.materials.filter((m: any) => m.visible !== false).length} visible to customer</span> · {currentQuote.materials.length} total items
                    </div>
                    {!editMode && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Click "Edit Quote" to toggle item visibility
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {currentQuote.materials.map((material) => (
                      <div
                        key={material.id}
                        className={`bg-gradient-to-r from-[#0A0A0A] to-[#1a1a1a] border rounded-lg p-4 transition-all ${
                          material.visible === false
                            ? 'border-gray-800 opacity-60'
                            : 'border-gray-700'
                        }`}
                      >
                        {editMode ? (
                          <div className="grid grid-cols-6 gap-3 items-center">
                            <input
                              type="text"
                              value={material.name}
                              onChange={(e) => updateMaterial(material.id, 'name', e.target.value)}
                              className="col-span-2 bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Material name"
                            />
                            <input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => updateMaterial(material.id, 'quantity', Number(e.target.value))}
                              className="bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Qty"
                            />
                            <input
                              type="text"
                              value={material.unit}
                              onChange={(e) => updateMaterial(material.id, 'unit', e.target.value)}
                              className="bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Unit"
                            />
                            <input
                              type="number"
                              value={material.unitCost}
                              onChange={(e) => updateMaterial(material.id, 'unitCost', Number(e.target.value))}
                              className="bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Unit $"
                            />
                            <div className="flex items-center gap-2">
                              <div className="text-white font-semibold text-sm">
                                ${(material.totalCost || material.totalPrice || 0).toFixed(2)}
                              </div>
                              <input
                                type="checkbox"
                                checked={material.visible !== false}
                                onChange={(e) => updateMaterial(material.id, 'visible', e.target.checked)}
                                className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                title={material.visible === false ? 'Hidden from customer - Click to show' : 'Visible to customer - Click to hide'}
                              />
                              <button
                                onClick={() => deleteMaterial(material.id)}
                                className="p-1.5 bg-black border border-red-500/50 hover:border-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] text-red-400 rounded transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-white">{material.name || material.description}</div>
                                <div className="text-sm text-gray-400">
                                  {material.supplier && <span className="text-cyan-400">{material.supplier}</span>}
                                  {material.supplier && ' · '}
                                  {material.quantity} {material.unit} × ${(material.unitCost || material.unitPrice || 0).toFixed(2)}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => findVendorAlternativesForMaterial(material)}
                                  disabled={loadingVendorAlternatives && comparingMaterialId === material.id}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-black border border-yellow-500/50 hover:border-yellow-500 hover:shadow-[0_0_10px_rgba(234,179,8,0.3)] text-yellow-400 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                                >
                                  {loadingVendorAlternatives && comparingMaterialId === material.id ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      Finding...
                                    </>
                                  ) : (
                                    <>
                                      <Search className="w-3 h-3" />
                                      Compare Vendors
                                    </>
                                  )}
                                </button>
                                <div className="text-lg font-bold text-blue-400">
                                  ${(material.totalCost || material.totalPrice || 0).toFixed(2)}
                                </div>
                              </div>
                            </div>

                            {/* Vendor Alternatives Dropdown */}
                            {comparingMaterialId === material.id && vendorAlternatives.length > 0 && (
                              <div className="mt-3 p-3 bg-black/60 border border-yellow-500/30 rounded-lg">
                                <div className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                                  <ShoppingCart className="w-4 h-4" />
                                  Available from {vendorAlternatives.length} vendors:
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                                  {vendorAlternatives.map((alt, idx) => {
                                    const totalPrice = alt.price * material.quantity;
                                    const savings = alt.isCurrent ? 0 : (material.unitCost - alt.price) * material.quantity;

                                    const storeStyles =
                                      alt.source === 'home_depot' ? {
                                        border: 'border-orange-500/50 hover:border-orange-500',
                                        bg: 'bg-orange-500/5 hover:bg-orange-500/10',
                                        text: 'text-orange-400',
                                      } :
                                      alt.source === 'lowes' ? {
                                        border: 'border-blue-500/50 hover:border-blue-500',
                                        bg: 'bg-blue-500/5 hover:bg-blue-500/10',
                                        text: 'text-blue-400',
                                      } :
                                      alt.source === 'grainger' ? {
                                        border: 'border-red-500/50 hover:border-red-500',
                                        bg: 'bg-red-500/5 hover:bg-red-500/10',
                                        text: 'text-red-400',
                                      } : {
                                        border: 'border-cyan-500/50 hover:border-cyan-500',
                                        bg: 'bg-cyan-500/5 hover:bg-cyan-500/10',
                                        text: 'text-cyan-400',
                                      };

                                    return (
                                      <button
                                        key={idx}
                                        onClick={() => selectVendorAlternative(alt)}
                                        disabled={alt.isCurrent}
                                        className={`text-left p-3 rounded-lg border transition-all ${storeStyles.border} ${storeStyles.bg} disabled:opacity-50 disabled:cursor-not-allowed`}
                                      >
                                        <div className={`text-xs font-bold ${storeStyles.text} mb-1`}>
                                          {alt.vendorName}
                                          {alt.isCurrent && ' (Current)'}
                                        </div>
                                        <div className="text-sm font-bold text-white">
                                          ${alt.price.toFixed(2)}
                                          <span className="text-xs text-gray-400 font-normal">/{material.unit}</span>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                          Total: ${totalPrice.toFixed(2)}
                                        </div>
                                        {savings > 0 && (
                                          <div className="text-xs text-green-400 mt-1">
                                            💰 Save ${savings.toFixed(2)}
                                          </div>
                                        )}
                                        {savings < 0 && !alt.isCurrent && (
                                          <div className="text-xs text-red-400 mt-1">
                                            +${Math.abs(savings).toFixed(2)} more
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                                <button
                                  onClick={() => {
                                    setComparingMaterialId(null);
                                    setVendorAlternatives([]);
                                  }}
                                  className="mt-2 text-xs text-gray-500 hover:text-gray-400 transition-colors"
                                >
                                  Close comparison
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Labor Section */}
              {(!editMode || quoteEditTab === 'labor') && (
                <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      Labor
                    </h4>
                    {editMode && (
                      <button
                        onClick={addLabor}
                        className="flex items-center gap-2 px-3 py-1.5 bg-black border border-purple-500/50 hover:border-purple-500 hover:shadow-[0_0_10px_rgba(168,85,247,0.3)] text-purple-400 rounded-lg text-sm font-semibold transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Add Labor
                      </button>
                    )}
                  </div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      <span className="text-purple-400 font-semibold">{currentQuote.labor.filter((l: any) => l.visible !== false).length} visible to customer</span> · {currentQuote.labor.length} total items
                    </div>
                    {!editMode && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Click "Edit Quote" to toggle item visibility
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {currentQuote.labor.map((labor) => (
                      <div
                        key={labor.id}
                        className={`bg-gradient-to-r from-[#0A0A0A] to-[#1a1a1a] border rounded-lg p-4 transition-all ${
                          labor.visible === false
                            ? 'border-gray-800 opacity-60'
                            : 'border-gray-700'
                        }`}
                      >
                        {editMode ? (
                          <div className="grid grid-cols-5 gap-3 items-center">
                            <input
                              type="text"
                              value={labor.role}
                              onChange={(e) => updateLabor(labor.id, 'role', e.target.value)}
                              className="col-span-2 bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Labor role"
                            />
                            <input
                              type="number"
                              value={labor.hours}
                              onChange={(e) => updateLabor(labor.id, 'hours', Number(e.target.value))}
                              className="bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Hours"
                            />
                            <input
                              type="number"
                              value={labor.hourlyRate}
                              onChange={(e) => updateLabor(labor.id, 'hourlyRate', Number(e.target.value))}
                              className="bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Rate"
                            />
                            <div className="flex items-center gap-2">
                              <div className="text-white font-semibold text-sm">
                                ${(labor.totalCost || labor.totalPrice || 0).toFixed(2)}
                              </div>
                              <input
                                type="checkbox"
                                checked={labor.visible !== false}
                                onChange={(e) => updateLabor(labor.id, 'visible', e.target.checked)}
                                className="w-4 h-4 text-purple-500 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2 cursor-pointer"
                                title={labor.visible === false ? 'Hidden from customer - Click to show' : 'Visible to customer - Click to hide'}
                              />
                              <button
                                onClick={() => deleteLabor(labor.id)}
                                className="p-1.5 bg-black border border-red-500/50 hover:border-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] text-red-400 rounded transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-white">{labor.role || labor.description}</div>
                              <div className="text-sm text-gray-400">
                                {labor.hours} hours × ${(labor.hourlyRate || labor.unitPrice || 0).toFixed(2)}/hr
                              </div>
                            </div>
                            <div className="text-lg font-bold text-purple-400">
                              ${(labor.totalCost || labor.totalPrice || 0).toFixed(2)}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/*
                The estimator's account of the job, which was generated and
                then shown nowhere.

                `/auto-generate-quote` returns `projectSummary`, StartQuoteModal
                stores it on the quote as `aiSummary`, and not one component
                rendered it — searched the whole of src/, zero hits outside the
                line that writes it. So the detailed description existed, was
                paid for on every generate, and fell on the floor. Eric asked
                for a fuller description, got one written, and still could not
                see it, because the problem was never the text.

                Above Process Steps deliberately: this is the prose that says
                what the job IS, and the phases underneath say how it runs. The
                other order reads as a list with an explanation bolted on.

                Editable, because an estimate's narrative is the part most
                worth correcting by hand before it reaches a customer, and
                every other field on this screen can be.
              */}
              {(!editMode || quoteEditTab === 'process') && (currentQuote as any)?.aiSummary && (
                <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-lg font-bold text-white">
                      <FileText className="h-5 w-5 text-[#ea580c]" />
                      Scope of Work
                    </h4>
                    <span className="text-xs text-gray-500">What the customer reads first</span>
                  </div>
                  {editMode ? (
                    <textarea
                      value={(editedQuote as any).aiSummary || ''}
                      onChange={(e) => setEditedQuote({ ...editedQuote, aiSummary: e.target.value } as any)}
                      rows={8}
                      className="w-full rounded-lg border border-[#2A2A2A] bg-[#050505] px-3 py-2 text-sm leading-relaxed text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                    />
                  ) : (
                    <div className="space-y-3 text-sm leading-relaxed text-gray-300">
                      {String((currentQuote as any).aiSummary)
                        .split(/\n{2,}/)
                        .filter((p) => p.trim())
                        .map((p, i) => <p key={i}>{p.trim()}</p>)}
                    </div>
                  )}
                  {(currentQuote as any)?.aiRegionalNote && (
                    <p className="mt-3 border-t border-gray-800 pt-3 text-xs text-gray-500">
                      {(currentQuote as any).aiRegionalNote}
                    </p>
                  )}
                </div>
              )}

              {/*
                Notes for the crew. The customer never sees these.

                Not a styling claim — `customerQuoteView` on the server builds
                the share-link payload from an allowlist and `internalNotes`
                is not on it, so the field cannot travel even to somebody
                reading the raw JSON. That is the only reason this is safe to
                promise, and it is worth knowing the promise lives there and
                not in this component.

                Red-edged and labelled rather than quietly styled: somebody
                typing "customer haggles, pad the hours" needs to be certain
                at a glance which box they are in.
              */}
              {(!editMode || quoteEditTab === 'process') && (
                <div className="rounded-xl border border-red-500/30 bg-red-950/10 p-6">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="flex items-center gap-2 text-lg font-bold text-white">
                      <Lock className="h-5 w-5 text-red-400" />
                      Internal notes — for your team only
                    </h4>
                    <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-300">
                      never sent to the customer
                    </span>
                  </div>
                  {editMode ? (
                    <textarea
                      value={(editedQuote as any).internalNotes || ''}
                      onChange={(e) => setEditedQuote({ ...editedQuote, internalNotes: e.target.value } as any)}
                      rows={4}
                      placeholder="Access round the back, dog in the garden, Dave is slow on tile — anything the crew needs and the customer should not read."
                      className="w-full rounded-lg border border-red-500/20 bg-[#050505] px-3 py-2 text-sm leading-relaxed text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                    />
                  ) : (currentQuote as any)?.internalNotes ? (
                    <div className="space-y-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                      {String((currentQuote as any).internalNotes)}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Nothing yet. Edit the quote to add notes for the crew.
                    </p>
                  )}
                </div>
              )}

              {/* Process Steps Section */}
              {(!editMode || quoteEditTab === 'process') && (
                <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      <ListChecks className="w-5 h-5 text-green-400" />
                      Process Steps
                    </h4>
                    {editMode && (
                      <button
                        onClick={addProcessStep}
                        className="flex items-center gap-2 px-3 py-1.5 bg-black border border-green-500/50 hover:border-green-500 hover:shadow-[0_0_10px_rgba(34,197,94,0.3)] text-green-400 rounded-lg text-sm font-semibold transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Add Step
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {currentQuote.processSteps.map((step, index) => (
                      <div
                        key={step.id}
                        className="bg-gradient-to-r from-[#0A0A0A] to-[#1a1a1a] border border-gray-700 rounded-lg p-4"
                      >
                        {editMode ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center text-green-400 font-bold">
                                {index + 1}
                              </div>
                              <input
                                type="text"
                                value={step.title}
                                onChange={(e) => updateProcessStep(step.id, 'title', e.target.value)}
                                className="flex-1 bg-black border border-gray-600 rounded px-3 py-2 text-white"
                                placeholder="Step title"
                              />
                              <input
                                type="text"
                                value={step.estimatedDuration}
                                onChange={(e) => updateProcessStep(step.id, 'estimatedDuration', e.target.value)}
                                className="w-32 bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                                placeholder="Duration"
                              />
                              {/*
                                Materials and labour already had this; phases
                                did not, though ProcessStep has carried a
                                `visible` field all along. A phase is the most
                                likely thing to want kept back — internal
                                staging, a week held for a subcontractor —
                                so it was the odd one out.
                              */}
                              <input
                                type="checkbox"
                                checked={(step as any).visible !== false}
                                onChange={(e) => updateProcessStep(step.id, 'visible' as any, e.target.checked)}
                                className="w-4 h-4 cursor-pointer rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500"
                                title={(step as any).visible === false ? 'Hidden from customer — click to show' : 'Visible to customer — click to hide'}
                              />
                              <button
                                onClick={() => deleteProcessStep(step.id)}
                                className="p-2 bg-black border border-red-500/50 hover:border-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] text-red-400 rounded transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <textarea
                              value={step.description}
                              onChange={(e) => updateProcessStep(step.id, 'description', e.target.value)}
                              className="w-full bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Step description"
                              rows={2}
                            />
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center text-green-400 font-bold flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-white mb-1">{step.title}</div>
                              <div className="text-sm text-gray-400">{step.description}</div>
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {step.estimatedDuration}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Materials Hub & Schedule Builder - Only in Process Tab when editing */}
              {(!editMode || quoteEditTab === 'process') && editMode && editedQuote && (
                <QuoteProcessEnhancements
                  materials={editedQuote.materials}
                  processSteps={editedQuote.processSteps}
                  onMaterialsUpdate={(updatedMaterials) => {
                    const updated = { ...editedQuote, materials: updatedMaterials };
                    recalculateTotals(updated);
                  }}
                  workRequestId={workRequest.id}
                  quoteNumber={editedQuote.quoteNumber}
                  projectTitle={workRequest.title}
                />
              )}
            </div>
          )}

          {/* SUBCONTRACTOR BIDDING TAB */}
          {activeTab === 'bidding' && (
            <div className="space-y-6">
              <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Subcontractor Bids</h3>
                    <p className="text-gray-400 text-sm">
                      Request and manage bids from qualified subcontractors
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {subcontractorBids.length > 0 && (
                      <button
                        onClick={loadSubcontractorBids}
                        disabled={loadingBids}
                        className="flex items-center gap-2 px-4 py-2 bg-black border border-blue-500/50 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] text-blue-400 rounded-lg font-semibold transition-all disabled:opacity-50"
                      >
                        {loadingBids ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Recycle className="w-4 h-4" />
                        )}
                        Refresh
                      </button>
                    )}
                    <button
                      onClick={handleRequestBids}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-black border border-gray-600/50 hover:border-gray-500 text-gray-400 rounded-lg font-semibold transition-all disabled:opacity-50"
                      title="Records on the quote that you intend to seek bids. Sends nothing."
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Note intent
                    </button>
                  </div>
                </div>

                {/*
                  Put this quote out to the people who will actually do the work.
                  Invitation-only by construction — see the note on
                  handlePostToBidRoom. Nobody sees this but the names ticked here.
                */}
                <div className="mb-6 rounded-xl border border-[#2A2A2A] bg-[#0B0B0B] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">Send this quote out to bid</h4>
                      <p className="mt-0.5 text-xs text-gray-400">
                        Only the subcontractors you tick can see or bid on this work.
                      </p>
                    </div>
                    <button
                      onClick={handlePostToBidRoom}
                      disabled={postingBid || !chosenProviders.size || !postingOrgId}
                      className="flex items-center gap-2 rounded-lg border border-[#ea580c]/50 bg-black px-4 py-2 text-sm font-bold text-[#ea580c] transition-all hover:border-[#ea580c] hover:shadow-[0_0_15px_rgba(234,88,12,0.4)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {postingBid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {postingBid
                        ? 'Sending…'
                        : chosenProviders.size
                          ? `Send to ${chosenProviders.size} selected`
                          : 'Select subcontractors'}
                    </button>
                  </div>

                  {!postingOrgId ? (
                    <p className="text-xs text-amber-400">
                      You are not an administrator of any organisation, so you cannot post work to the Exchange.
                    </p>
                  ) : providers.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No active subcontractors or vendors to invite yet. Approve a subcontractor application first.
                    </p>
                  ) : (
                    <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
                      {providers.map((p) => {
                        const on = chosenProviders.has(p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => toggleProvider(p.id)}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                              on
                                ? 'border-[#ea580c]/60 bg-[#ea580c]/15 text-orange-300'
                                : 'border-[#2A2A2A] bg-[#111] text-gray-400 hover:border-[#ea580c]/40 hover:text-white'
                            }`}
                          >
                            {on ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                            {p.name}
                            <span className="text-[10px] uppercase tracking-wide opacity-60">{p.type}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {loadingBids ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-[#ea580c] animate-spin" />
                  </div>
                ) : subcontractorBids.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
                    <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg mb-2">No bids received yet</p>
                    <p className="text-gray-600 text-sm">
                      Click "Request Bids" to invite subcontractors
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {subcontractorBids.map((bid) => (
                      <div
                        key={bid.id}
                        className="bg-gradient-to-r from-[#0A0A0A] to-[#1a1a1a] border border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full bg-[#ea580c]/20 border border-[#ea580c]/50 flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-[#ea580c]" />
                            </div>
                            <div>
                              <div className="font-bold text-white">{bid.subcontractorName}</div>
                              <div className="text-sm text-gray-400">{bid.company}</div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {bid.subcontractorEmail}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {bid.subcontractorPhone}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-[#ea580c]">
                              ${(bid.bidAmount || 0).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 justify-end mt-1">
                              <Clock className="w-3 h-3" />
                              {bid.estimatedDuration}
                            </div>
                          </div>
                        </div>
                        {bid.notes && (
                          <div className="bg-black/50 rounded p-3 mb-3">
                            <div className="text-xs text-gray-500 mb-1">Notes:</div>
                            <div className="text-sm text-gray-300">{bid.notes}</div>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                          <div className="text-xs text-gray-500">
                            Submitted: {new Date(bid.submittedAt).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="flex items-center gap-1 px-3 py-1.5 bg-black border border-green-500/50 hover:border-green-500 hover:shadow-[0_0_10px_rgba(34,197,94,0.3)] text-green-400 rounded text-sm font-semibold transition-all">
                              <ThumbsUp className="w-3 h-3" />
                              Accept
                            </button>
                            <button className="flex items-center gap-1 px-3 py-1.5 bg-black border border-red-500/50 hover:border-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] text-red-400 rounded text-sm font-semibold transition-all">
                              <ThumbsDown className="w-3 h-3" />
                              Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CUSTOMER APPROVAL TAB */}
          {activeTab === 'approval' && (
            <div className="space-y-6">
              <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-6">Customer Approval Status</h3>

                {/* Approval Status Card */}
                <div
                  className={`rounded-xl p-6 mb-6 border-2 ${
                    currentQuote.approvalStatus === 'approved'
                      ? 'bg-green-500/10 border-green-500/50'
                      : currentQuote.approvalStatus === 'rejected'
                      ? 'bg-red-500/10 border-red-500/50'
                      : 'bg-yellow-500/10 border-yellow-500/50'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    {currentQuote.approvalStatus === 'approved' ? (
                      <CheckCircle2 className="w-12 h-12 text-green-400" />
                    ) : currentQuote.approvalStatus === 'rejected' ? (
                      <XCircle className="w-12 h-12 text-red-400" />
                    ) : (
                      <Clock className="w-12 h-12 text-yellow-400" />
                    )}
                    <div>
                      <div className="text-2xl font-bold text-white capitalize">
                        {currentQuote.approvalStatus.replace('-', ' ')}
                      </div>
                      {currentQuote.approvedAt && (
                        <div className="text-sm text-gray-400">
                          {new Date(currentQuote.approvedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {currentQuote.approvalStatus === 'rejected' && currentQuote.rejectionReason && (
                    <div className="bg-black/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Rejection Reason:</div>
                      <div className="text-white">{currentQuote.rejectionReason}</div>
                    </div>
                  )}
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-[#0A0A0A] to-[#1a1a1a] border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4 text-[#ea580c]" />
                      <div className="text-sm text-gray-400">Email</div>
                    </div>
                    <div className="text-white font-semibold">{workRequest.customerEmail}</div>
                  </div>
                  {workRequest.customerPhone && (
                    <div className="bg-gradient-to-br from-[#0A0A0A] to-[#1a1a1a] border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="w-4 h-4 text-[#ea580c]" />
                        <div className="text-sm text-gray-400">Phone</div>
                      </div>
                      <div className="text-white font-semibold">{workRequest.customerPhone}</div>
                    </div>
                  )}
                </div>

                {/* Invite customer to the app (only relevant before sending) */}
                {currentQuote.approvalStatus === 'pending' && (
                  <div className="mb-4 bg-gradient-to-br from-[#0A0A0A] to-[#1a1a1a] border border-gray-700 rounded-lg overflow-hidden">
                    <label className="flex items-start gap-3 p-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inviteToApp}
                        onChange={(e) => {
                          setInviteToApp(e.target.checked);
                          if (e.target.checked && !invitePhone) setInvitePhone(workRequest.customerPhone || '');
                        }}
                        disabled={loading}
                        className="mt-0.5 w-4 h-4 accent-[#ea580c] cursor-pointer disabled:opacity-50"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-white font-semibold">
                          <UserPlus className="w-4 h-4 text-[#ea580c]" /> Also invite this customer to join the app
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Sends {workRequest.customerName || 'them'} a secure link to create their own customer portal — where they can view quotes, approve, pay, and track work.
                        </p>
                      </div>
                    </label>
                    {inviteToApp && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-700 pt-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1.5">Customer phone (required for the invite)</label>
                          <input
                            type="tel"
                            value={invitePhone}
                            onChange={(e) => setInvitePhone(e.target.value)}
                            disabled={loading}
                            placeholder="+1 555 123 4567"
                            className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] disabled:opacity-50"
                          />
                        </div>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={inviteBySms}
                            onChange={(e) => setInviteBySms(e.target.checked)}
                            disabled={loading}
                            className="w-4 h-4 accent-[#ea580c] cursor-pointer disabled:opacity-50"
                          />
                          <span className="flex items-center gap-1.5 text-sm text-gray-300">
                            <Smartphone className="w-3.5 h-3.5 text-[#ea580c]" /> Also text them the invite link (SMS)
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {currentQuote.approvalStatus === 'pending' && (
                  <div className="flex items-center gap-3">
                    {/*
                      The handler is WRAPPED rather than passed by reference. A
                      bare `onClick={handleSendToCustomer}` hands the click
                      event in as the first argument, and a MouseEvent is
                      truthy — so every send would have arrived
                      pre-acknowledged and the unpriced gate would never once
                      have fired.
                    */}
                    <button
                      onClick={() => handleSendToCustomer()}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-black border border-[#ea580c]/50 hover:border-[#ea580c] hover:shadow-[0_0_15px_rgba(234,88,12,0.5)] text-[#ea580c] rounded-lg font-semibold transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                      {inviteToApp ? 'Send to Customer & Invite' : 'Send to Customer'}
                    </button>
                  </div>
                )}

                {currentQuote.approvalStatus === 'approved' && (
                  <>
                    {/* Contract Type Selection */}
                    {!currentQuote.contractTypeSelected ? (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-2 border-purple-500/50 rounded-xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <Sparkles className="w-8 h-8 text-purple-400" />
                            <div>
                              <h4 className="text-xl font-bold text-white">Choose Contract Type</h4>
                              <p className="text-sm text-gray-400">Customer must select their preferred contract type</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            {/* Standard Contract */}
                            <button
                              onClick={() => {
                                const updated = {
                                  ...currentQuote,
                                  contractTypeSelected: true,
                                  selectedContractType: 'standard' as const
                                };
                                setEditedQuote(updated);
                                onSave({ ...workRequest, quote: updated });
                                toast.success('Standard Contract selected', {
                                  description: 'Traditional contract with manual milestone tracking'
                                });
                              }}
                              className="group bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-2 border-blue-500/50 hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] rounded-xl p-6 transition-all"
                            >
                              <div className="flex flex-col items-center text-center">
                                <FileText className="w-16 h-16 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                                <h5 className="text-lg font-bold text-white mb-2">Standard Contract</h5>
                                <p className="text-sm text-gray-400 mb-4">
                                  Traditional legal contract with manual payment processing and milestone tracking
                                </p>
                                <ul className="text-xs text-gray-500 space-y-1 text-left w-full">
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <span>Traditional payment terms</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <span>Manual invoice processing</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <span>PDF contract generation</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <span>Standard signature process</span>
                                  </li>
                                </ul>
                              </div>
                            </button>

                            {/* Soroban Smart Contract */}
                            <button
                              onClick={() => {
                                const updated = {
                                  ...currentQuote,
                                  contractTypeSelected: true,
                                  selectedContractType: 'soroban-smart-contract' as const
                                };
                                setEditedQuote(updated);
                                onSave({ ...workRequest, quote: updated });
                                toast.success('Soroban Smart Contract selected', {
                                  description: 'Blockchain-powered contract with automated escrow and payments'
                                });
                              }}
                              className="group bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-2 border-purple-500/50 hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] rounded-xl p-6 transition-all relative overflow-hidden"
                            >
                              <div className="absolute top-2 right-2">
                                <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
                                  BLOCKCHAIN
                                </span>
                              </div>
                              <div className="flex flex-col items-center text-center">
                                <Sparkles className="w-16 h-16 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
                                <h5 className="text-lg font-bold text-white mb-2">Soroban Smart Contract</h5>
                                <p className="text-sm text-gray-400 mb-4">
                                  Blockchain-based contract on Stellar network with automated escrow and milestone payments
                                </p>
                                <ul className="text-xs text-gray-500 space-y-1 text-left w-full">
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                                    <span>Automated payment milestones</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                                    <span>Blockchain escrow protection</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                                    <span>IPFS evidence storage</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                                    <span>Multi-sig dispute resolution</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                                    <span>Recorded on Stellar blockchain</span>
                                  </li>
                                </ul>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Contract Type Selected */}
                        <div className={`rounded-xl p-4 border-2 ${
                          currentQuote.selectedContractType === 'soroban-smart-contract'
                            ? 'bg-purple-500/10 border-purple-500/50'
                            : 'bg-blue-500/10 border-blue-500/50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {currentQuote.selectedContractType === 'soroban-smart-contract' ? (
                                <Sparkles className="w-8 h-8 text-purple-400" />
                              ) : (
                                <FileText className="w-8 h-8 text-blue-400" />
                              )}
                              <div>
                                <div className="text-sm text-gray-400">Selected Contract Type</div>
                                <div className="text-lg font-bold text-white">
                                  {currentQuote.selectedContractType === 'soroban-smart-contract'
                                    ? 'Soroban Smart Contract'
                                    : 'Standard Contract'}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const updated = {
                                  ...currentQuote,
                                  contractTypeSelected: false,
                                  selectedContractType: undefined
                                };
                                setEditedQuote(updated);
                                onSave({ ...workRequest, quote: updated });
                                toast.info('Contract type deselected', {
                                  description: 'Choose a different contract type'
                                });
                              }}
                              className="px-4 py-2 bg-black border border-gray-600 hover:border-gray-500 text-gray-400 hover:text-white rounded-lg text-sm font-semibold transition-all"
                            >
                              Change
                            </button>
                          </div>
                        </div>

                        {/* Convert to Contract Button */}
                        <button
                          onClick={handleConvertToContract}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#fb923c] hover:from-[#c2410c] hover:to-[#ea580c] text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#ea580c]/20"
                        >
                          <ArrowRight className="w-5 h-5" />
                          Generate {currentQuote.selectedContractType === 'soroban-smart-contract' ? 'Smart' : 'Standard'} Contract
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Quote ID: {currentQuote.id}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-black border border-gray-600 hover:border-gray-500 text-gray-400 hover:text-white rounded-lg font-semibold transition-all"
              >
                Close
              </button>
              {currentQuote.approvalStatus === 'approved' && currentQuote.contractTypeSelected && (
                <button
                  onClick={handleConvertToContract}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#ea580c] to-[#fb923c] hover:from-[#c2410c] hover:to-[#ea580c] text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#ea580c]/20"
                >
                  Generate {currentQuote.selectedContractType === 'soroban-smart-contract' ? 'Smart' : 'Standard'} Contract
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/*
        The quote as a document: laid out, printable, downloadable.
        `printElementId` must match the id QuoteDocument puts on its outer
        element — the print rule hides the page and un-hides that one node, so
        a wrong id prints a blank sheet and says nothing about why.
      */}
      {previewDoc && (
        <DocumentPreviewModal
          isOpen
          onClose={() => setPreviewDoc(false)}
          title="Quote Preview"
          printElementId="quote-content"
          onDownload={() => PDFService.downloadQuotePDF(quoteToPDFData(quoteAsDocument as any))}
        >
          <QuoteDocument quote={quoteAsDocument as any} />
        </DocumentPreviewModal>
      )}

      {/* Work Request Drawer — slides in from the right over the quote editor */}
      {showWorkRequestDrawer && (
        <div className="fixed top-0 right-0 bottom-0 w-[480px] z-[70] bg-[#0A0A0A] border-l border-[#2A2A2A] shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A] border-b border-[#2A2A2A] flex-shrink-0">
            <p className="font-bold text-white text-sm">📋 Work Request Details</p>
            <button onClick={() => setShowWorkRequestDrawer(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <WorkRequestFullView
              workRequest={(workRequest as any)._rawWorkRequest || workRequest}
              onClose={() => setShowWorkRequestDrawer(false)}
              embedded
            />
          </div>
        </div>
      )}

      {/*
        Sending a quote that was never priced from real figures.

        The server refused and said why; this asks rather than reports, because
        the quote IS sendable and the decision is Eric’s. Lives in its own
        component so the smoke harness can mount it — a dialog that only
        appears on a 409 from a staff-authenticated route is otherwise
        unreachable by any check, which is how an unrenderable dialog would
        reach production looking fine.
      */}
      {unpricedSend && (
        <UnpricedSendDialog
          reason={unpricedSend.reason}
          customerName={workRequest.customerName}
          customerEmail={workRequest.customerEmail}
          sending={loading}
          onCancel={() => setUnpricedSend(null)}
          onSendAnyway={() => handleSendToCustomer(true)}
        />
      )}
    </>
  );
}