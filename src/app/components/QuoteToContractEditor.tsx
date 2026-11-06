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

import { useState, useEffect, useMemo, useRef } from 'react';
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
  Printer,
  Upload,
  Sparkles,
  ShoppingCart,
  Hammer,
  Layers,
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
import { buildPaymentSchedule, scheduleTotal, groupPhasesInto, DEPOSIT_MINIMUM, type Draw } from '../lib/paymentSchedule';
import { drawReadiness, isPhaseComplete, withPhaseCompletion, dueCount } from '../lib/phaseCompletion';
import { renamePhase, wouldMerge } from '../lib/phaseRename';
import { schedulePhasesOf, contractTotalOf } from '../lib/quoteToSchedule';
import { drawToInvoice } from '../lib/drawToInvoice';
import DocumentPreviewModal from './documents/DocumentPreviewModal';
import QuoteDocument from './documents/QuoteDocument';
import { quoteToPDFData } from './documents/quoteMath';
import { buildQuotePdf } from '../lib/services/quotePdfLayout';
import { quoteToPdfDocument } from '../lib/quoteToPdfDocument';
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
import { asFraction, markupRatesOf, markupOn, hasMarkup, describeRates } from '../lib/quoteMarkup';
/* The server's pricing arithmetic, imported rather than reimplemented — see
   the note in recalculateTotals, and the precedent in lib/laborTasks.ts. */
import { applyMargins } from '../../../supabase/functions/server/quoteMargins.ts';

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
  /**
   * Which phase of the job this line belongs to.
   *
   * The estimator sets it and until now nothing could change it, which made
   * it the one field on a quote that could be WRONG AND UNFIXABLE. That
   * matters more than it used to: the payment schedule draws one invoice per
   * phase, weighted by what each phase is worth, so a line tagged to the
   * wrong phase bills the customer at the wrong milestone — and an untagged
   * line is spread across every other phase by weight instead of sitting in
   * its own.
   */
  phase?: string;
  /**
   * Is this on the quote at all?
   *
   * NOT THE SAME QUESTION AS `visible`, and the difference is money:
   *
   *   included: false   the work is not on the quote and is NOT CHARGED.
   *                     The total drops by its amount.
   *   visible: false    the work IS charged; the customer is simply not
   *                     shown the line. The total does not move.
   *
   * Two toggles because they answer two questions a contractor genuinely
   * asks: "am I doing this?" and "am I telling them what it costs?" One
   * control cannot do both, and conflating them either bills for work that
   * was dropped or gives away work that was not.
   *
   * ABSENT MEANS INCLUDED, so every quote written before this is unchanged.
   */
  included?: boolean;
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
  /** Which phase of the job. See the note on MaterialItem. */
  phase?: string;
  /** On the quote and charged for? See the note on MaterialItem. */
  included?: boolean;
}

interface ProcessStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  estimatedDuration: string;
  dependencies?: string[];
  visible?: boolean;
  /** On the quote at all? See the note on MaterialItem. */
  included?: boolean;
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
  /** Counted against the bill? Excluding one puts its cost back on us. */
  included?: boolean;
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
  /**
   * SAVE AND CLOSE. The Save button, and nothing else.
   *
   * The parent screens read this as "the user is finished" and shut the
   * editor — Quote Prep literally calls `setShowQuoteEditor(false)` inside
   * it. That is right for the Save button and wrong for everything else, so
   * every background save uses `onQuoteChange` below instead.
   */
  onSave: (updatedRequest: WorkRequest) => void;
  /**
   * THE QUOTE CHANGED; KEEP THE PARENT IN STEP. Closes nothing.
   *
   * Several controls here write to the server themselves and then need the
   * list behind the editor to show the new figures: the customer-visibility
   * section switches, the payment schedule, marking a draw invoiced, a
   * reprice, picking a contract type. Every one of them was calling
   * `onSave`, so ticking "don't show materials to the customer" saved the
   * change and then threw you out of the editor. Two different intentions
   * were sharing one prop. This is the other one.
   *
   * Optional, so a parent that does not care simply omits it and nothing
   * closes.
   */
  onQuoteChange?: (updatedRequest: WorkRequest) => void;
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
  const pct = (v: any) => {
    const f = asFraction(v);
    return f > 0 ? `${Math.round(f * 1000) / 10}%` : '';
  };
  const has = (n: any) => Number(n) > 0;

  const softCosts: any[] = Array.isArray(quote?.additionalCosts) ? quote.additionalCosts : [];
  const rows: Array<[string, any, string?]> = [
    ['Materials', quote?.materialsSubtotal],
    ['Labour', quote?.laborSubtotal],
    ['Soft costs', quote?.additionalCostsSubtotal ?? softCosts.reduce((s, a) => s + (Number(a?.amount) || 0), 0)],
    /*
      These are stored as FRACTIONS — `applyMargins` says so at the top of
      `quoteMargins.ts` and emits 0.10 for ten per cent. Printing the stored
      value straight into a % sign therefore read "0.1%" on a quote carrying
      ten, which understates the markup by a factor of a hundred on the one
      panel whose whole job is to explain where the price came from.

      `pct` goes through the same normaliser the per-phase markup uses, so
      the figure in this panel and the figure on the PDF cannot disagree.
    */
    ['Overhead', quote?.overheadAmount, pct(quote?.overheadPercent)],
    ['Profit', quote?.profitAmount, pct(quote?.profitPercent)],
    ['Contingency', quote?.contingencyAmount, pct(quote?.contingencyPercent)],
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

/**
 * The "on the quote" toggle, rendered the same way everywhere.
 *
 * Four item types need it — materials, labour, phases and what the owner is
 * supplying — and four hand-written copies of a control that decides whether
 * something is CHARGED FOR is four chances to get the default backwards.
 * Absent means included; only an explicit false excludes.
 *
 * DECLARED AT MODULE LEVEL, NOT INSIDE THE EDITOR.
 *
 * A component defined in a render body is a NEW component type on every
 * render, so React throws the old one away and mounts a fresh one rather
 * than updating it. The quote editor re-renders on every keystroke in every
 * price and description field, and a long quote carries one of these per
 * line — so typing a material name was tearing down and rebuilding every
 * toggle on the screen, and the button you had just clicked was never the
 * button that existed a moment later. It closes over nothing, so there was
 * never a reason for it to live in there.
 */
function IncludeToggle({ on, onToggle, noun }: { on: boolean; onToggle: () => void; noun: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={on
        ? `On the quote and charged for. Click to take this ${noun} off — the total will drop.`
        : `Not on the quote and not charged. Click to put this ${noun} back on.`}
      className={`flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
        on
          ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
          : 'border border-gray-700 bg-black/40 text-gray-500 hover:text-gray-300'
      }`}
    >
      {on ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {on ? 'On quote' : 'Off quote'}
    </button>
  );
}

export function QuoteToContractEditor({
  workRequest,
  onClose,
  onSave,
  onQuoteChange,
  onSendToCustomer,
  onConvertToContract
}: QuoteToContractEditorProps) {
  /**
   * Tell the parent the quote moved, without ever closing the editor.
   *
   * Falls back to nothing rather than to `onSave`: a parent that has not
   * opted in shows a stale figure until it refetches, which is cosmetic.
   * Falling back to `onSave` would reinstate the exact bug this exists to
   * fix — a background save slamming the screen shut.
   */
  const syncQuote = (updatedRequest: WorkRequest) => { onQuoteChange?.(updatedRequest); };

  /**
   * Write part of the quote to the server, without closing anything.
   *
   * Two controls used to get their persistence for free, by handing the
   * whole work request to `onSave` and letting the parent write it — which
   * is the same call that shuts the editor. Splitting save-and-close off
   * meant those two had to start saving themselves, or they would have gone
   * quiet and lost the change on reload, which is worse than the bug being
   * fixed. Returns false on failure so the caller can say so rather than
   * claim a save that did not happen.
   */
  const persistQuotePatch = async (patch: Record<string, any>): Promise<boolean> => {
    const quoteId = workRequest.quote?.id || (currentQuote as any)?.id;
    if (!quoteId) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/make-server-3eae23a6/quotes/${encodeURIComponent(quoteId)}`, {
        method: 'PUT',
        headers: await quoteAuthHeaders(true),
        body: JSON.stringify(patch),
      });
      return res.ok;
    } catch {
      return false;
    }
  };
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
  const [quoteEditTab, setQuoteEditTab] = useState<'phases' | 'materials' | 'labor' | 'process'>('phases');
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

  /**
   * Memoised because its IDENTITY is a dependency, not just its contents.
   *
   * `normalizeQuote` spreads every material and labour line, so it returned a
   * brand new object on every single render. The PDF preview effect depends
   * on this, and a dependency that changes every render means the effect's
   * CLEANUP also runs every render — which revoked the blob URL the iframe
   * had just been handed, faster than it could load it. The preview was a
   * white rectangle, and the white was the iframe's own background.
   */
  const currentQuote = useMemo(
    () => (editMode ? editedQuote : normalizeQuote(workRequest.quote)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editMode, editedQuote, workRequest.quote],
  );

  /**
   * The phases this job actually has, for the pickers on each line.
   *
   * Taken from the process steps rather than from whatever the lines happen
   * to say, because the steps are what the customer reads and what the
   * payment schedule draws against. Any phase a line mentions that the steps
   * do not is appended, so an estimator's stray tag is visible and fixable
   * rather than silently absent from the list that would let you fix it.
   */
  const phaseOptions = useMemo(() => {
    const out: string[] = [];
    const push = (v: any) => {
      const t = String(v || '').trim();
      if (t && !out.includes(t)) out.push(t);
    };
    for (const step of ((currentQuote as any)?.processSteps || [])) push(step?.title || step?.step);
    for (const line of [...((currentQuote as any)?.materials || []), ...((currentQuote as any)?.labor || [])]) {
      push(line?.phase);
    }
    return out;
  }, [currentQuote]);

  /**
   * Every line gathered under the process it belongs to.
   *
   * "can we make sure that all the sections in the line items are together
   * so i can make sure materials and labor cost for that process are
   * correct?" — they were in SEPARATE TABS, so checking one process meant
   * flipping between Materials and Labour and filtering by eye. You cannot
   * verify a phase's cost that way, only estimate it.
   *
   * Ordered by `phaseOptions`: the job's own step order first, with anything
   * only the lines mention appended. That is the same ordering authority
   * `groupLinesByPhase` uses for the document, so this screen and the PDF
   * cannot disagree about what a process holds or what it comes to.
   *
   * EMPTY PROCESSES ARE SHOWN HERE, which is the opposite of what the
   * document does. On a quote, a phase with no lines is not billed and so is
   * not printed. Here, a process with nothing tagged to it is precisely the
   * mistake somebody is looking for, and hiding it would hide the fault.
   *
   * So is the untagged bucket. Those lines land in a loose "Additional
   * items" group at the bottom of the customer's quote; this is where that
   * gets caught, rather than by the customer asking what it is.
   */
  const phaseBreakdown = useMemo(() => {
    const q: any = currentQuote || {};
    const materials: any[] = Array.isArray(q.materials) ? q.materials : [];
    const labor: any[] = Array.isArray(q.labor) ? q.labor : [];
    /**
     * Soft costs that name a phase belong to that phase.
     *
     * Trash removal is why. It sits in `additionalCosts` and now carries a
     * phase, and this screen exists to check "the money under each process
     * is right" — a subtotal that leaves the skip out is not right, and is
     * wrong in the direction that reads as cheaper than the quote.
     *
     * Unphased soft costs are left out, exactly as before. They are not
     * under any process, which is the honest answer for an overhead.
     */
    const softCosts: any[] = (Array.isArray(q.additionalCosts) ? q.additionalCosts : [])
      .filter((a: any) => String(a?.phase || "").trim());

    const lineTotal = (line: any): number => {
      const stated = Number(line?.totalCost ?? line?.amount);
      if (Number.isFinite(stated)) return stated;
      const qty = Number(line?.quantity ?? line?.hours ?? 1) || 0;
      const rate = Number(line?.unitCost ?? line?.unitPrice ?? line?.hourlyRate ?? 0) || 0;
      return qty * rate;
    };
    /* The same predicate the totals use. An excluded line is not charged, so
       adding it up here would make this screen disagree with the price at the
       bottom of the quote — on the screen whose whole job is checking it. */
    const charged = (l: any) => l?.included !== false;
    const sum = (rows: any[]) =>
      Math.round(rows.filter(charged).reduce((t, l) => t + lineTotal(l), 0) * 100) / 100;
    const of = (rows: any[], phase: string) =>
      rows.filter((r) => String(r?.phase || '').trim() === phase);

    const rates = markupRatesOf(q);
    const withMarkup = hasMarkup(rates);

    const groups = phaseOptions.map((phase) => {
      const mats = of(materials, phase);
      const labs = of(labor, phase);
      const matTotal = sum(mats);
      const labTotal = sum(labs);
      const softs = of(softCosts, phase);
      const softTotal = sum(softs);
      const subtotal = Math.round((matTotal + labTotal + softTotal) * 100) / 100;
      return {
        phase, mats, labs, softs, matTotal, labTotal, softTotal, subtotal,
        markup: withMarkup ? markupOn(subtotal, rates).total : 0,
        empty: mats.length === 0 && labs.length === 0 && softs.length === 0,
      };
    });

    const uMats = materials.filter((m) => !String(m?.phase || '').trim());
    const uLabs = labor.filter((l) => !String(l?.phase || '').trim());
    const uMatTotal = sum(uMats);
    const uLabTotal = sum(uLabs);

    return {
      groups,
      untagged: {
        mats: uMats, labs: uLabs,
        matTotal: uMatTotal, labTotal: uLabTotal,
        subtotal: Math.round((uMatTotal + uLabTotal) * 100) / 100,
        any: uMats.length + uLabs.length > 0,
      },
      rateLabel: withMarkup ? describeRates(rates) : '',
      withMarkup,
      lineTotal,
    };
  }, [currentQuote, phaseOptions]);

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
      syncQuote({ ...workRequest, quote: updated as Quote });
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
   * The logo, as bytes jsPDF can actually draw.
   *
   * `companyLogo` is a URL. `doc.addImage` needs a data URL or a decoded
   * image, and it is synchronous — so the fetch has to have happened before
   * the Download click, not during it. Resolved once when the logo is known
   * and held, rather than refetched per download.
   *
   * A logo that will not load leaves this empty and the PDF simply has no
   * mark on it. A missing logo is a worse-looking quote; a thrown error is
   * no quote at all.
   */
  const [logoDataUrl, setLogoDataUrl] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    if (!companyLogo) { setLogoDataUrl(''); return; }
    (async () => {
      try {
        const res = await fetch(companyLogo);
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (!cancelled) setLogoDataUrl(dataUrl);
      } catch {
        if (!cancelled) setLogoDataUrl('');
      }
    })();
    return () => { cancelled = true; };
  }, [companyLogo]);

  /**
   * Build the PDF for a given audience.
   *
   * `forCustomer` is the whole reason this takes an argument: the copy Eric
   * prints for himself shows every line including the ones the customer is
   * not shown, each marked as hidden, while the copy that reaches a customer
   * obeys the same rules the share link does. A PDF emailed out is exactly as
   * public as that link, so the two must not disagree.
   */
  /**
   * How much this quote is holding back, counted for the preview banner.
   *
   * Eric opened View / PDF to check that unticking a line had worked, saw
   * the line still there, and reasonably concluded it had not. It had — the
   * preview opens on the OFFICE copy, which shows withheld lines ON PURPOSE,
   * each marked, because the person who priced the job needs to see
   * everything. The customer copy next to it was correct the whole time.
   *
   * That is a defensible default and a terrible thing to leave unsaid. So
   * the banner now states the number out loud instead of relying on anyone
   * noticing a parenthetical at the end of a table row.
   *
   * Lines whose section is switched off are counted too — they are withheld
   * from the customer just as surely, and a count that ignored them would
   * under-report what is being held back.
   */
  const withheldCount = useMemo(() => {
    const q: any = currentQuote || {};
    const sec = q.customerSections || { materials: true, labor: true, processDetail: true };
    let n = 0;
    for (const [key, rows] of [
      ['materials', Array.isArray(q.materials) ? q.materials : []],
      ['labor', Array.isArray(q.labor) ? q.labor : []],
    ] as Array<[string, any[]]>) {
      // Only a section that is OFF withholds whole lines. 'no-rates' still
      // sends every line, so counting those as withheld would overstate
      // what is being kept back.
      const sectionOff = sec[key] === false || sec[key] === 'off';
      for (const r of rows) {
        // Off the quote entirely is not "withheld" — it is not on either copy.
        if (r?.included === false) continue;
        if (sectionOff || r?.visible === false) n++;
      }
    }
    return n;
  }, [currentQuote]);

  const buildPdf = (forCustomer: boolean) =>
    buildQuotePdf(quoteToPdfDocument(
      { ...(currentQuote as any), clientName: workRequest.customerName },
      { forCustomer, logoDataUrl, workRequest: workRequest as any },
    ));

  /**
   * The preview shows the ACTUAL PDF, not an HTML lookalike.
   *
   * It used to render `QuoteDocument` while the Download button produced a
   * different layout entirely — so the preview was the old flat list with no
   * logo, and the new document only existed inside the downloaded file. Eric
   * clicked View and saw the wrong thing, which is exactly the two-renderings
   * problem this work was meant to remove, reintroduced one layer up.
   *
   * Rendering the generated PDF in an iframe makes preview, print and
   * download the same bytes. There is no second layout left to drift.
   *
   * WHICH COPY IS PREVIEWED
   *
   * The internal one, with every line and the withheld ones marked. This is
   * the office view; the customer copy is what the email attaches, and
   * there is a toggle below to look at that instead — because "what will
   * they actually receive" is a question worth being able to answer without
   * sending it.
   */
  /**
   * Defaults to the CUSTOMER copy, because the risk is not symmetric.
   *
   * Download saves whichever copy this is set to, under the same filename
   * either way. Defaulting to the office copy meant the quickest path —
   * open, Download, attach to an email — produced the file that contains
   * every line marked `visible: false`, annotated "(hidden from customer)".
   * Seeing our own copy by accident costs nothing; sending it discloses the
   * withheld lines and, on a de-rated quote, the rate card behind them.
   *
   * The Email button is unaffected: it has always built the customer copy
   * explicitly and could not send the other one.
   */
  const [previewAsCustomer, setPreviewAsCustomer] = useState(true);
  const [previewUrl, setPreviewUrl] = useState('');

  /**
   * The effect rebuilds on what the PDF CONTAINS, not on object identity.
   *
   * Memoising `currentQuote` fixes the common case, but it is still only as
   * stable as the `workRequest` prop handed down from the parent. A content
   * signature cannot be destabilised from above: if the bytes would be the
   * same there is no rebuild, so no cleanup, so the blob URL the iframe is
   * holding survives. Only computed while the modal is open — there is
   * nothing to key when there is nothing being previewed.
   */
  const pdfKey = useMemo(() => {
    if (!previewDoc) return '';
    try {
      return JSON.stringify([previewAsCustomer, !!logoDataUrl, currentQuote]);
    } catch {
      // A quote that will not serialise still deserves a preview; falling
      // back to identity is no worse than the behaviour this replaced.
      return String(Date.now());
    }
  }, [previewDoc, previewAsCustomer, logoDataUrl, currentQuote]);

  useEffect(() => {
    if (!previewDoc) { setPreviewUrl(''); return; }
    let url = '';
    try {
      // `bloburl` hands back a URL object, not a string. React would coerce
      // it when setting `src`, but holding the real string keeps the revoke
      // in the cleanup honest about what it is revoking.
      url = String(buildPdf(previewAsCustomer).output('bloburl'));
      setPreviewUrl(url);
    } catch (err) {
      console.error('[quote] could not render the PDF preview:', err);
      setPreviewUrl('');
    }
    return () => {
      // A blob URL held after the modal closes is a leak that survives until
      // the tab does, and these are whole documents.
      if (url) { try { URL.revokeObjectURL(url); } catch { /* already gone */ } }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfKey]);

  /**
   * Email the quote as a PDF, to whatever address is wanted.
   *
   * "or i should be able to email a copy to there personal email" — so the
   * address is editable rather than fixed to the one on the record. The
   * person paying is often not the person whose email is on the job, and a
   * send that can only reach the file copy is a send that gets done by hand
   * outside the system.
   *
   * It attaches the CUSTOMER copy, not the internal one. The internal PDF
   * carries lines marked "hidden from customer", and mailing that to the
   * customer would be worse than having no hide feature at all.
   */
  const [emailingQuote, setEmailingQuote] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  /**
   * Offer them an account alongside the quote.
   *
   * Default ON, because a customer reading a quote is the warmest moment
   * there is to get them into the portal — and the portal is where they
   * approve it, see the job, and pay. Off is a deliberate choice for the
   * ones who will never use it.
   *
   * It issues a REAL invite through the same endpoint Create Portal uses, so
   * the account is provisioned and appears in Sent Invites. A link to a
   * generic signup page would leave them typing details we already hold and
   * arriving unconnected to this job.
   */
  const [inviteWithQuote, setInviteWithQuote] = useState(true);

  useEffect(() => {
    if (emailingQuote) setEmailTo(workRequest.customerEmail || '');
  }, [emailingQuote, workRequest.customerEmail]);

  const handleEmailQuote = async () => {
    const to = emailTo.trim();
    if (!/^\S+@\S+\.\S+$/.test(to)) { toast.error('Enter a valid email address.'); return; }
    setEmailSending(true);
    try {
      const doc = buildPdf(true);
      const dataUri = doc.output('datauristring');
      const pdfBase64 = dataUri.slice(dataUri.indexOf('base64,') + 'base64,'.length);
      const number = (currentQuote as any)?.quoteNumber || 'draft';

      /**
       * `html`, not `body`. The endpoint requires it and answers 400
       * "to, subject, and html are required" otherwise — which the first
       * version of this would have hit on every single send.
       */
      const esc = (s: string) => String(s || '').replace(/[&<>]/g, (ch) =>
        ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : '&gt;');
      const name = esc(workRequest.customerName || '');
      const title = esc(workRequest.title || '');
      const total = Number((currentQuote as any)?.totalCost || 0)
        .toLocaleString('en-US', { style: 'currency', currency: 'USD' });

      const html = `
<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;color:#222">
  <p>Hi${name ? ` ${name}` : ''},</p>
  <p>Your estimate${title ? ` for <strong>${title}</strong>` : ''} is attached as a PDF.</p>
  <p style="font-size:18px;margin:18px 0"><strong>${esc(number)}</strong> — ${total}</p>
  ${inviteWithQuote ? `
  <div style="border:1px solid #e6e6e6;border-radius:10px;padding:16px;margin:22px 0;background:#fafafa">
    <p style="margin:0 0 8px;font-weight:600">Follow this job online</p>
    <p style="margin:0 0 12px;font-size:14px;color:#555">
      We've set up an account for you. You can approve the estimate, watch progress,
      see photos and pay — all in one place. Check your inbox for a separate email
      with your sign-in link.
    </p>
  </div>` : ''}
  <p style="font-size:14px;color:#555">Any questions, just reply to this email.</p>
</div>`.trim();

      const res = await fetch(`${API_BASE_URL}/make-server-3eae23a6/email-center/send`, {
        method: 'POST',
        headers: await quoteAuthHeaders(true),
        body: JSON.stringify({
          to,
          subject: `Your estimate ${number}${workRequest.title ? ` — ${workRequest.title}` : ''}`,
          html,
          attachments: [{ filename: `Estimate_${number}.pdf`, content: pdfBase64 }],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        toast.error(data?.error || `Could not send the email (HTTP ${res.status}).`);
        return;
      }

      /**
       * The invite goes AFTER the quote email, and its failure does not fail
       * the send. The estimate reaching them is the point; an account is the
       * bonus. Reporting "could not send" because the optional half failed
       * would have Eric re-sending a quote that already arrived.
       */
      let invited = false;
      if (inviteWithQuote) {
        try {
          const phone = String(workRequest.customerPhone || '').trim();
          if (!name || !phone) throw new Error('needs a name and phone number');
          const inv = await fetch(`${API_BASE_URL}/make-server-3eae23a6/owner-provisioning/invites`, {
            method: 'POST',
            headers: await quoteAuthHeaders(true),
            body: JSON.stringify({
              name: workRequest.customerName, email: to, phone, portalType: 'customer',
            }),
          });
          const invData = await inv.json().catch(() => ({}));
          invited = inv.ok && invData?.success !== false;
          if (!invited) throw new Error(invData?.error || `HTTP ${inv.status}`);
        } catch (err: any) {
          toast.warning('Estimate sent, but the account invitation did not go out.', {
            description: `${err?.message || err}. Invite them from Admin Command Center → Create Portal.`,
          });
        }
      }

      toast.success(
        invited ? `Estimate and account invitation sent to ${to}.` : `Estimate emailed to ${to}.`,
      );
      setEmailingQuote(false);
    } catch (err: any) {
      toast.error(`Could not send the email: ${err?.message || err}`);
    } finally {
      setEmailSending(false);
    }
  };

  /**
   * Flip one customer-visibility section, and make it stick.
   *
   * These toggles are deliberately usable WITHOUT entering edit mode — Eric
   * wants to change what a customer sees whenever he needs to, not only
   * while mid-edit. That creates a trap: outside edit mode nothing calls
   * `handleSaveQuote`, so a toggle would appear to work, look correct on
   * screen, and be gone on reload. Worse than a disabled control, because
   * the user believes the customer's view changed.
   *
   * So outside edit mode it saves straight away. Inside, it only updates
   * state and rides along with everything else on Save, which avoids writing
   * half-finished edits to the server.
   */
  const [savingSections, setSavingSections] = useState(false);

  const toggleCustomerSection = async (key: 'materials' | 'labor' | 'processDetail') => {
    /**
     * Built on `currentQuote` — WHAT IS ON THE SCREEN — not on `editedQuote`.
     *
     * `editedQuote` is seeded once, at mount. Outside edit mode the screen is
     * showing `normalizeQuote(workRequest.quote)` instead, so spreading
     * `editedQuote` here wrote back a snapshot that could be stale, or —
     * if the editor had opened before the quote arrived — empty, which sent
     * a quote with no lines in it to the parent and the server.
     *
     * `currentQuote` is that same expression, so this is now always the
     * thing the user is looking at.
     */
    const base: any = currentQuote || editedQuote;
    if (!base) { toast.error('The quote is still loading — try that again in a moment.'); return; }

    const current = base.customerSections
      || { materials: true, labor: true, processDetail: true };

    /**
     * Materials and labour cycle THREE states; process detail stays on/off.
     *
     *   full -> no-rates -> off -> full
     *
     * "even if i dont want the material and labor rates on the quote i want
     * to see the line item and the entire process details." The middle
     * state is the one that was missing, and it is probably the one most
     * quotes should use: the customer sees what the job consists of and
     * what each part costs, with no two numbers to divide into our rate.
     */
    const cycle: Record<string, string> = { full: 'no-rates', 'no-rates': 'off', off: 'full' };
    const readMode = (v: any) => (v === false || v === 'off' ? 'off' : v === 'no-rates' ? 'no-rates' : 'full');
    const next = key === 'processDetail'
      ? { ...current, processDetail: current.processDetail === false }
      : { ...current, [key]: cycle[readMode(current[key])] };
    const updated = { ...base, customerSections: next } as any;
    setEditedQuote(updated);
    if (editMode) return;

    const quoteId = workRequest.quote?.id;
    if (!quoteId) return;
    setSavingSections(true);
    try {
      const res = await fetch(`${API_BASE_URL}/make-server-3eae23a6/quotes/${quoteId}`, {
        method: 'PUT',
        headers: await quoteAuthHeaders(true),
        body: JSON.stringify({ customerSections: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      syncQuote({ ...workRequest, quote: updated } as any);
      const label = key === 'processDetail' ? 'Process detail' : key === 'labor' ? 'Labour' : 'Materials';
      const landed = (next as any)[key];
      toast.success(
        landed === false || landed === 'off' ? `${label} hidden from the customer.`
          : landed === 'no-rates' ? `${label} shown without quantities or rates.`
            : `${label} shown in full to the customer.`,
      );
    } catch (err: any) {
      // Put it back, so the screen never claims a change the server refused.
      setEditedQuote(editedQuote);
      toast.error(`Could not save that change: ${err?.message || err}`);
    } finally {
      setSavingSections(false);
    }
  };

  /**
   * Hide or show ONE line, without entering edit mode.
   *
   * "i should be able to select a single item." The three section switches
   * above are all-or-nothing — all your materials or none of them — and the
   * per-line controls lived only inside edit mode, behind a button that also
   * puts every price on the screen into a text box. So the common job,
   * "don't show them THAT one", had no way to be done.
   *
   * Flips `visible`, which means the line is STILL CHARGED and its cost
   * stays in its phase total; the customer simply does not see it itemised.
   * Taking work off the quote entirely is the `included` toggle in edit
   * mode, because that moves money and should not be one click away from a
   * read-only screen.
   *
   * Saves immediately outside edit mode, for the same reason the section
   * switches do: a control that looks like it worked and is gone on reload
   * is worse than one that is disabled.
   */
  const [savingLine, setSavingLine] = useState<string | null>(null);

  const toggleLineVisible = async (kind: 'materials' | 'labor', id: string) => {
    const base: any = currentQuote || editedQuote;
    if (!base) { toast.error('The quote is still loading — try that again in a moment.'); return; }

    const rows = Array.isArray(base[kind]) ? base[kind] : [];
    const row = rows.find((r: any) => r?.id === id);
    if (!row) return;
    const nextVisible = row.visible === false;
    const updatedRows = rows.map((r: any) => (r?.id === id ? { ...r, visible: nextVisible } : r));
    const updated = { ...base, [kind]: updatedRows } as any;
    setEditedQuote(updated);
    if (editMode) return;

    const quoteId = workRequest.quote?.id;
    if (!quoteId) return;
    setSavingLine(id);
    const ok = await persistQuotePatch({ [kind]: updatedRows });
    setSavingLine(null);
    if (!ok) {
      // Put it back, so the screen never claims a change the server refused.
      setEditedQuote(base);
      toast.error('Could not save that change.');
      return;
    }
    syncQuote({ ...workRequest, quote: updated } as any);
    toast.success(
      nextVisible
        ? 'Shown to the customer.'
        : 'Hidden from the customer — still charged, and still in its phase total.',
    );
  };

  /**
   * The payment schedule — the deposit and the per-phase draws.
   *
   * Eric: "the invoices should be built off the payment schedule." This is
   * the schedule they are built off. Each draw is one phase of the job
   * priced at its share of the contract, so a draw reads "Structural, on
   * completion, $4,390" — a figure the customer can check against work they
   * can walk around and look at.
   *
   * It is STORED on the quote rather than recomputed on every render. Once a
   * schedule has gone to a customer it is a commitment, and a commitment that
   * silently re-apportions itself because somebody edited a line item is not
   * one. Regenerating is a button, not a side effect.
   */
  const paymentSchedule: Draw[] = Array.isArray((currentQuote as any)?.paymentSchedule)
    ? (currentQuote as any).paymentSchedule
    : [];

  /**
   * The deposit percentage, with no effect keeping it in step.
   *
   * Deriving it from the existing schedule and syncing with `useEffect` is
   * what produced the white PDF preview earlier today: a dependency that
   * changes every render runs the cleanup every render too. So there is no
   * effect here. The displayed value is the override if the user has typed
   * one, otherwise whatever the saved schedule implies, otherwise 30.
   */
  const [depositPctOverride, setDepositPctOverride] = useState<number | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const contractTotal = contractTotalOf(currentQuote);
  const savedDepositPct = (() => {
    const deposit = paymentSchedule.find((d) => d.type === 'deposit');
    if (!deposit || !(contractTotal > 0)) return null;
    return Math.round((deposit.amount / contractTotal) * 100);
  })();
  /**
   * The deposit, never below the company minimum.
   *
   * "lets make the deposit a minimum of 30%." Clamped HERE rather than only
   * on the input, because the stored value on an older quote can be lower —
   * a saved 15% would otherwise survive untouched and rebuild a schedule
   * under the floor without anybody typing anything.
   *
   * Materials are bought and a crew booked before a penny of progress is
   * billable. A job that starts on less than this is one we are financing.
   */
  const depositFloorPct = Math.round(DEPOSIT_MINIMUM * 100);
  const depositPct = Math.max(
    depositFloorPct,
    depositPctOverride ?? savedDepositPct ?? depositFloorPct,
  );

  /**
   * How many payments to split the job into, after the deposit.
   *
   * Defaults to one per phase, which is what the schedule has always built.
   * Choosing fewer merges neighbouring phases — see `groupPhasesInto` — so
   * three payments across seven phases become three progress payments, each
   * released by a milestone the customer can see finished.
   */
  const [paymentCountOverride, setPaymentCountOverride] = useState<number | null>(null);

  /**
   * Write a schedule, whatever produced it.
   *
   * `regenerateSchedule` had this inline, which was fine while generating
   * was the only way a schedule could change. Editing one by hand needs the
   * same save — state, server, parent — and two copies of a save that writes
   * what a customer will be invoiced against is one too many.
   */
  const commitSchedule = async (draws: Draw[], note?: string) => {
    const base: any = editedQuote || currentQuote;
    const updated = { ...base, paymentSchedule: draws } as any;
    setEditedQuote(updated);
    if (editMode) return;

    const quoteId = workRequest.quote?.id;
    if (!quoteId) { toast.success('Schedule changed. Save the quote to keep it.'); return; }
    setSavingSchedule(true);
    const ok = await persistQuotePatch({ paymentSchedule: draws });
    setSavingSchedule(false);
    if (!ok) {
      setEditedQuote(base);
      toast.error('Could not save the schedule.');
      return;
    }
    syncQuote({ ...workRequest, quote: updated } as any);
    if (note) toast.success(note);
  };

  /**
   * A schedule somebody writes themselves.
   *
   * "please allow me to create a custom as well. deposit, after a certain
   * part in the job then the final or on larger jobs more payment upon
   * completion of certain projects."
   *
   * Building from phases gives a draw per phase, which is right for a job
   * priced that way and wrong for plenty of others — a kitchen does not need
   * seven invoices, and a build with a long structural stage may want two
   * payments inside it. So every part of a draw is editable and draws can be
   * added, reordered and removed.
   *
   * WHAT IS NOT EDITABLE IS A DRAW ALREADY INVOICED. There is a real invoice
   * in the world against it; changing its amount here would leave the two
   * disagreeing with nothing to say which is right, and deleting it would
   * leave the invoice with no schedule line explaining what it was for.
   *
   * The sum is NOT forced to the contract. A custom schedule mid-edit is
   * legitimately out by whatever has not been allocated yet, and snapping it
   * straight would silently move money the moment somebody typed a figure.
   * The existing mismatch banner below says what the gap is instead — which
   * is the same thing a rebuilt schedule gets when the quote moves under it.
   */
  const drawLocked = (d: Draw) => d.status !== 'pending';

  const addDraw = () => {
    const draws = [...paymentSchedule, {
      id: `draw_${Date.now().toString(36)}`,
      type: 'phase' as const,
      phase: null,
      label: 'New payment',
      amount: 0,
      trigger: 'On agreement',
      status: 'pending' as const,
    }];
    void commitSchedule(draws, 'Payment added to the schedule.');
  };

  const updateDraw = (id: string, field: string, value: any) => {
    const draws = paymentSchedule.map((d) => {
      if (d.id !== id || drawLocked(d)) return d;
      if (field === 'phase') {
        const phase = String(value || '').trim();
        return {
          ...d,
          phase: phase || null,
          type: (phase ? 'phase' : d.type === 'deposit' ? 'deposit' : 'balance') as any,
          /* The trigger follows the phase unless somebody has written their
             own words over it. A draw tied to Framing that still reads "on
             completion of Strip-out" is worse than one with no trigger. */
          trigger: phase ? `On completion of ${phase}` : d.trigger,
        };
      }
      if (field === 'amount') {
        return { ...d, amount: Math.max(0, Math.round((Number(value) || 0) * 100) / 100) };
      }
      return { ...d, [field]: value };
    });
    void commitSchedule(draws);
  };

  const removeDraw = (id: string) => {
    const target = paymentSchedule.find((d) => d.id === id);
    if (target && drawLocked(target)) {
      toast.error('That draw has already been invoiced. Void the invoice first.');
      return;
    }
    void commitSchedule(paymentSchedule.filter((d) => d.id !== id), 'Payment removed.');
  };

  const moveDraw = (id: string, by: -1 | 1) => {
    const i = paymentSchedule.findIndex((d) => d.id === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= paymentSchedule.length) return;
    const draws = paymentSchedule.slice();
    [draws[i], draws[j]] = [draws[j], draws[i]];
    void commitSchedule(draws);
  };

  /**
   * Build the schedule from the quote's own phases.
   *
   * A draw that has already been invoiced keeps its status and its invoice
   * id. Regenerating is for a quote whose figures have moved, not a way to
   * quietly un-bill something — losing that state would leave an invoice in
   * the world with nothing on the schedule saying it was ever raised.
   */
  /** The phases a schedule could draw against — the ceiling on payments. */
  const availablePhaseCount = useMemo(
    () => schedulePhasesOf(currentQuote).length,
    [currentQuote],
  );
  const paymentCount = Math.min(
    Math.max(1, availablePhaseCount || 1),
    paymentCountOverride ?? (availablePhaseCount || 1),
  );

  const regenerateSchedule = async () => {
    const phases = schedulePhasesOf(currentQuote);
    /* Merging happens before the money is worked out, so the draws still
       come out of the same tested allocator and still sum to the contract
       exactly. Nothing about the arithmetic changes with the count. */
    const fresh = buildPaymentSchedule({
      phases: groupPhasesInto(phases, paymentCount),
      total: contractTotal,
      depositRate: depositPct / 100,
    });
    const previous = new Map(paymentSchedule.map((d) => [d.id, d]));
    const draws = fresh.map((d) => {
      const was = previous.get(d.id);
      return was && was.status !== 'pending'
        ? { ...d, status: was.status, invoiceId: (was as any).invoiceId }
        : d;
    });

    const updated = { ...(editedQuote || currentQuote), paymentSchedule: draws } as any;
    setEditedQuote(updated);
    /**
     * In edit mode this used to return in silence.
     *
     * Nothing was written, nothing was said, and the only visible change was
     * a block further down the page that the person clicking is usually not
     * looking at. From the chair it is a dead button — and if they leave
     * without pressing Save, the schedule they just built is gone with no
     * warning that it was ever only local.
     *
     * Saying so costs a line. The draws are on `editedQuote`, so Save does
     * persist them; the problem was never the data, it was that nobody was
     * told which of the two states they were in.
     */
    if (editMode) {
      toast.success(
        `Schedule built — ${draws.length} draw${draws.length === 1 ? '' : 's'}. Save the quote to keep it.`,
      );
      return;
    }

    const quoteId = workRequest.quote?.id;
    if (!quoteId) { toast.success('Schedule built. Save the quote to keep it.'); return; }
    setSavingSchedule(true);
    try {
      const res = await fetch(`${API_BASE_URL}/make-server-3eae23a6/quotes/${quoteId}`, {
        method: 'PUT',
        headers: await quoteAuthHeaders(true),
        body: JSON.stringify({ paymentSchedule: draws }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      syncQuote({ ...workRequest, quote: updated } as any);
      toast.success(`Payment schedule built — ${draws.length} draw${draws.length === 1 ? '' : 's'}.`);
    } catch (err: any) {
      setEditedQuote(editedQuote);
      toast.error(`Could not save the schedule: ${err?.message || err}`);
    } finally {
      setSavingSchedule(false);
    }
  };

  /**
   * Mark a phase of the job finished, or unfinished again.
   *
   * "we can set payment schedules with completion of certain phases." The
   * schedule already drew one invoice per phase and each draw already said
   * "on completion of Framing" — but nothing recorded whether Framing was
   * DONE, so that sentence was a note to a human and the list could not
   * tell a draw that was due from one months away.
   *
   * Stored on the process step rather than on the draw, because it is a
   * fact about the job and not about the invoice: rebuilding the schedule
   * after a re-price must not lose which phases are finished.
   *
   * Saves immediately outside edit mode, like the visibility switches and
   * for the same reason — a control that looks like it worked and is gone
   * on reload is worse than one that is disabled.
   */
  const [markingPhase, setMarkingPhase] = useState<string | null>(null);

  const togglePhaseComplete = async (phase: string) => {
    const base: any = currentQuote || editedQuote;
    if (!base) { toast.error('The quote is still loading — try that again in a moment.'); return; }

    const steps = Array.isArray(base.processSteps) ? base.processSteps : [];
    const done = isPhaseComplete(steps, phase);
    const next = withPhaseCompletion(steps, phase, done ? null : new Date().toISOString());
    const updated = { ...base, processSteps: next } as any;
    setEditedQuote(updated);
    if (editMode) return;

    const quoteId = workRequest.quote?.id;
    if (!quoteId) return;
    setMarkingPhase(phase);
    const ok = await persistQuotePatch({ processSteps: next });
    setMarkingPhase(null);
    if (!ok) {
      setEditedQuote(base);
      toast.error('Could not save that change.');
      return;
    }
    syncQuote({ ...workRequest, quote: updated } as any);
    toast.success(
      done
        ? `${phase} is no longer marked complete.`
        : `${phase} marked complete — its draw is ready to invoice.`,
    );
  };

  /**
   * Raise the invoice for one draw.
   *
   * This is the sentence "the invoices should be built off the payment
   * schedule" made literal: the draw decides the amount, the phase decides
   * the line items, and nothing is typed in twice.
   *
   * THE SERVER OWNS THE ARITHMETIC. It recomputes every invoice total from
   * the line items and ignores a posted total that disagrees — which is
   * right, and which is why `drawToInvoice` arranges the lines, the rate and
   * the discount so the server's own sum lands on the draw. The deposit
   * already collected rides as the discount, because that is what it is.
   *
   * A draw that no longer matches its phase is still raisable, but it says
   * so first. That gap means the quote was repriced after the schedule was
   * agreed, and whether to bill the old figure or rebuild is a judgement
   * nobody should have made for them silently.
   */
  const [raisingDraw, setRaisingDraw] = useState<string | null>(null);

  const raiseInvoiceForDraw = async (draw: Draw) => {
    const payload = drawToInvoice({ quote: currentQuote, draw });
    if (!payload.line_items.length) {
      toast.error(`${draw.label} has no priced lines to invoice.`);
      return;
    }

    setRaisingDraw(draw.id);
    try {
      const res = await fetch(`${API_BASE_URL}/make-server-3eae23a6/invoices`, {
        method: 'POST',
        headers: await quoteAuthHeaders(true),
        body: JSON.stringify({
          ...payload,
          workRequestId: workRequest.id,
          customerName: (workRequest as any).customerName || (workRequest as any).client_name || '',
          customerEmail: (workRequest as any).customerEmail || (workRequest as any).client_email || '',
          // Raised as a draft. An invoice that emails itself the instant a
          // button is pressed is one nobody gets to read first, and this one
          // is generated rather than typed — all the more reason to look.
          is_draft: true,
          status: 'draft',
          notes: `${draw.label} — ${draw.trigger}`,
          process_steps: (currentQuote as any)?.processSteps || [],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json().catch(() => ({}));

      /**
       * Mark the draw, so the schedule knows what has been billed.
       *
       * Without this the panel would happily raise the same draw again, and
       * a job can only be billed for a phase once. The invoice id is kept so
       * there is a trail back from the schedule to the document.
       */
      const draws = paymentSchedule.map((d) =>
        d.id === draw.id
          ? { ...d, status: 'invoiced' as const, invoiceId: body?.invoice?.id || body?.id }
          : d,
      );
      const updated = { ...(editedQuote || currentQuote), paymentSchedule: draws } as any;
      setEditedQuote(updated);

      const quoteId = workRequest.quote?.id;
      if (quoteId) {
        await fetch(`${API_BASE_URL}/make-server-3eae23a6/quotes/${quoteId}`, {
          method: 'PUT',
          headers: await quoteAuthHeaders(true),
          body: JSON.stringify({ paymentSchedule: draws }),
        }).catch(() => { /* the invoice exists; the mark can be redone */ });
        syncQuote({ ...workRequest, quote: updated } as any);
      }

      const money = payload.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      toast.success(
        payload.matchesDraw
          ? `Draft invoice raised for ${draw.label} — ${money}.`
          : `Draft invoice raised for ${draw.label} at ${money}, which is NOT the ${draw.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} on the schedule. Rebuild the schedule if the quote has changed.`,
      );
    } catch (err: any) {
      toast.error(`Could not raise that invoice: ${err?.message || err}`);
    } finally {
      setRaisingDraw(null);
    }
  };

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
  const [confirmingRebuild, setConfirmingRebuild] = useState(false);

  /**
   * An armed rebuild lapses after a few seconds.
   *
   * Rebuilding discards a schedule somebody may have written by hand, so the
   * two-click confirmation stays. What it must not do is cancel itself the
   * instant focus moves — see the note on the button.
   */
  useEffect(() => {
    if (!confirmingRebuild) return;
    const timer = setTimeout(() => setConfirmingRebuild(false), 6000);
    return () => clearTimeout(timer);
  }, [confirmingRebuild]);
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

  /**
   * Whether the estimator panel is open, so something else can open it.
   *
   * "i dont see where in the quote editor that i can see the area i can tell
   * the ai estimator to make changes?" — it was there, on this tab, inside a
   * collapsed section headed "The brief this was priced from". That title
   * describes HISTORY. Somebody looking for a way to instruct the estimator
   * has no reason to open a box that offers to tell them what already
   * happened, so the feature was functionally invisible.
   *
   * It is now reachable from the toolbar, which means its open state has to
   * be controllable from outside rather than left to the browser.
   */
  const [briefOpen, setBriefOpen] = useState(false);

  const openEstimatorPanel = () => {
    setActiveTab('quote');
    setBriefOpen(true);
    // After the tab has rendered — the panel does not exist until then.
    requestAnimationFrame(() => {
      document.getElementById('quote-estimator-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

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

      /**
       * Hold the new lines HERE as well as telling the parent.
       *
       * This used to lean on the parent handing a fresh `workRequest` back
       * down, which only worked because that same call closed the editor and
       * the next open re-read it. The editor stays open now, so it has to
       * show the re-priced lines itself.
       */
      setEditedQuote(normalizeQuote(updated.quote));
      const saved = await persistQuotePatch({
        materials: updated.quote.materials,
        labor: updated.quote.labor,
        processSteps: updated.quote.processSteps,
        totalCost: updated.quote.totalCost,
        aiSummary: updated.quote.aiSummary,
        aiAssumptions: updated.quote.aiAssumptions,
        aiRegionalNote: updated.quote.aiRegionalNote,
      });
      syncQuote(updated);
      toast.success('Quote re-priced from the updated brief.', {
        id: toastId,
        description: saved
          ? 'Line items replaced. Customer details and the quote number are unchanged.'
          : 'Line items replaced on screen — the save did not go through, so press Save.',
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
  /**
   * `phase` is optional and is the whole point of the by-process editor.
   *
   * Adding a line from inside a process has to put it IN that process. The
   * alternative — add it loose, then remember to tag it — is how lines end
   * up in the "Additional items" group at the bottom of a customer's quote,
   * which is the fault the by-process view exists to stop.
   */
  const addMaterial = (phase?: string) => {
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
      ...(phase ? { phase } : {}),
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
  /** See `addMaterial` — the phase is carried for the same reason. */
  const addLabor = (phase?: string) => {
    if (!editedQuote) return;
    const newLabor: LaborItem = {
      id: `l-${Date.now()}`,
      role: 'New Labor Role',
      description: '',
      hours: 0,
      hourlyRate: 0,
      totalCost: 0,
      visible: true,
      ...(phase ? { phase } : {}),
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

  /**
   * The title a phase had when somebody started typing over it.
   *
   * A phase has no id — `materials[].phase`, `labor[].phase` and
   * `paymentSchedule[].phase` all point at it by its TEXT — so renaming the
   * step has to carry those three with it. See `phaseRename.ts`; the one
   * that matters is the draw, which otherwise names a phase that no longer
   * exists and can never be marked complete, so the payment never falls due.
   *
   * Captured on FOCUS and applied on BLUR, deliberately. Renaming on every
   * keystroke would also work right up until a title passes through the name
   * of another phase on its way somewhere else — typing "Framing work" over
   * "Frame prep" is momentarily "Framing", which would merge the two and
   * never unmerge them. A committed value cannot do that by accident.
   */
  const phaseTitleOnFocus = useRef<{ id: string; title: string } | null>(null);

  const beginPhaseRename = (id: string, title: string) => {
    phaseTitleOnFocus.current = { id, title: String(title || '').trim() };
  };

  const commitPhaseRename = (id: string) => {
    const started = phaseTitleOnFocus.current;
    phaseTitleOnFocus.current = null;
    if (!editedQuote || !started || started.id !== id) return;

    const step = (editedQuote.processSteps || []).find((s) => s.id === id);
    const to = String((step as any)?.title || '').trim();
    if (!to || to === started.title) return;

    /**
     * Renaming onto a name that already exists MERGES the two, because the
     * name is the identity and two phases cannot share one. That is a real
     * thing to do deliberately and a nasty thing to do by accident, so it
     * is allowed and said out loud.
     */
    const merging = wouldMerge(editedQuote, started.title, to);

    // Returns the same object when there is nothing to move, so this cannot
    // cost a render for a rename that did not happen.
    const renamed = renamePhase(editedQuote, started.title, to);
    if (renamed === editedQuote) return;
    setEditedQuote(renamed);

    toast[merging ? 'warning' : 'success'](
      merging
        ? `"${started.title}" merged into "${to}" — one phase now, with both sets of lines.`
        : `Renamed to "${to}" — its materials, labour and payment moved with it.`,
    );
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

    /**
     * EXCLUDED LINES ARE NOT CHARGED FOR.
     *
     * This is the difference between the two toggles, and it is the line of
     * code that makes it real. "Hidden" means the customer is not shown the
     * line but is still paying for it — so a hidden line stays in these
     * sums. "Excluded" means the work is not on the quote at all, so it must
     * come out, and the price has to drop by exactly its amount.
     *
     * Getting this wrong in the forgiving direction — leaving excluded lines
     * in — would charge somebody for work that the quote they are reading
     * does not mention, which is the worst of the available failures.
     */
    const onQuote = (line: any) => line?.included !== false;

    const materialsSubtotal = (quote.materials || []).filter(onQuote).reduce((sum, m) => sum + lineTotal(m), 0);
    const laborSubtotal = (quote.labor || []).filter(onQuote).reduce((sum, l) => sum + lineTotal(l), 0);

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
     * floored: a quote that ends up in the customer's favour is a real
     * situation and somebody should see it rather than have it rounded away.
     */
    const creditsSubtotal = (quote.credits || []).filter(onQuote)
      .reduce((sum, c) => sum + Math.abs(Number(c.amount) || 0), 0);

    /**
     * Soft costs — permits, skips, plant hire. They are direct cost and
     * carry overhead and profit like anything else, and leaving them out
     * here would both understate the total and understate the markup on it.
     */
    const additionalCostsSubtotal = (Array.isArray((quote as any).additionalCosts)
      ? (quote as any).additionalCosts
      : []).filter(onQuote).reduce((sum: number, a: any) => sum + (Number(a?.amount) || 0), 0);

    /**
     * THE SERVER'S OWN ARITHMETIC, NOT A SECOND COPY OF IT.
     *
     * This function used to compute
     *
     *     totalCost = materials + labour + tax - credits
     *
     * with no overhead, no profit and no contingency. Every quote the
     * estimator generates carries all three, so opening one and touching a
     * single quantity silently knocked roughly 25% off the price — on a
     * $10,000 job, $2,500 of margin gone for fixing a typo, with nothing on
     * screen to say it had happened.
     *
     * The fix is deliberately NOT to add three lines of multiplication here.
     * `quoteMargins.ts` exists because the worst pricing fault this project
     * has had was two modules each doing its own version of this and
     * disagreeing about whether a rate was 10 or 0.10 — which shipped 40%
     * overhead on every repriced quote and passed both sides' unit tests.
     * Its header says so at length. Writing a fourth implementation in a
     * `.tsx` file the test runner cannot even load would be repeating that
     * mistake on purpose, so this imports the same tested function the
     * server prices with, exactly as `laborTasks.ts` imports `laborMath`.
     *
     * EVERY RATE IS PASSED EXPLICITLY, AND ABSENT MEANS ZERO.
     *
     * `applyMargins` defaults a MISSING rate to 10/10/5 because that is the
     * right thing when PRICING a new job. It is the wrong thing here: a
     * hand-built quote that never had a margin would suddenly gain 25% the
     * first time somebody corrected a line, which is the same class of
     * silent repricing as the bug being fixed, just in the other direction.
     * Passing a number — zero when there is none — means the defaults can
     * never fire and this only ever preserves what the quote already had.
     *
     * `asFraction` normalises the two conventions in the codebase, so a
     * rate stored as 10 and one stored as 0.10 both mean ten per cent.
     */
    const margins = applyMargins({
      materialsSubtotal,
      laborSubtotal,
      additionalCostsSubtotal,
      creditsSubtotal,
      overheadPercent: asFraction((quote as any).overheadPercent),
      profitPercent: asFraction((quote as any).profitPercent),
      contingencyPercent: asFraction((quote as any).contingencyPercent),
      taxRatePercent: asFraction(quote.taxRate),
    });

    /**
     * Returned as well as set, so a caller that has to PERSIST the result
     * does not recompute it a second way.
     *
     * Changing the tax rate outside edit mode writes to the server, and the
     * figures it writes must be the ones on the screen. Working them out
     * again at the call site is how two sums of the same quote end up
     * disagreeing — the exact fault `quoteMargins.ts` exists to prevent.
     */
    const computed = {
      ...quote,
      materialsSubtotal,
      laborSubtotal,
      creditsSubtotal,
      additionalCostsSubtotal,
      /**
       * The AMOUNTS are written back, not just the total.
       *
       * "How this quote was built" reads `overheadAmount` and the PDF's
       * per-phase markup reads the percents. Recomputing the total while
       * leaving the amounts at their old values would leave the panel
       * explaining the price with figures that no longer sum to it — the
       * one place a wrong number is certain to be noticed and believed.
       */
      directCost: margins.directCost,
      overheadAmount: margins.overheadAmount,
      profitAmount: margins.profitAmount,
      contingencyAmount: margins.contingencyAmount,
      preTaxTotal: margins.preTaxTotal,
      taxAmount: margins.taxAmount,
      totalCost: margins.totalCost,
    } as Quote;
    setEditedQuote(computed);
    return computed;
  };

  /**
   * Set the sales tax, in or out of edit mode.
   *
   * "please let me add the tax if nessary." The control existed and was
   * locked behind Edit Quote — a button that also turns every price on the
   * screen into a text box. But "does this one need tax?" is a question
   * answered while REVIEWING a quote, not while rewriting it, so the one
   * field that answers it was unreachable at the moment it gets asked.
   *
   * Outside edit mode it saves immediately, like the visibility switches
   * and the deposit, and for the same reason: a figure that looks applied
   * and is gone on reload is worse than one that is disabled.
   *
   * ZERO IS A REAL ANSWER and is honoured as one. New Hampshire has no
   * sales tax; several states exempt residential construction. The old
   * code read the rate with `|| 0.08`, which quietly replaced a deliberate
   * nought with eight per cent — `quoteMargins.pickFraction` exists
   * because of exactly that bug, and this passes the rate explicitly so
   * the default can never fire.
   */
  const [savingTax, setSavingTax] = useState(false);

  const changeTaxRate = async (percent: number) => {
    const base: any = currentQuote || editedQuote;
    if (!base) { toast.error('The quote is still loading — try that again in a moment.'); return; }

    const rate = Math.min(0.30, Math.max(0, (Number(percent) || 0) / 100));
    const computed = recalculateTotals({ ...base, taxRate: rate } as Quote);
    if (editMode || !computed) return;

    const quoteId = workRequest.quote?.id;
    if (!quoteId) return;
    setSavingTax(true);
    const ok = await persistQuotePatch({
      taxRate: rate,
      taxAmount: (computed as any).taxAmount,
      preTaxTotal: (computed as any).preTaxTotal,
      totalCost: (computed as any).totalCost,
    });
    setSavingTax(false);
    if (!ok) {
      setEditedQuote(base);
      toast.error('Could not save the tax rate.');
      return;
    }
    syncQuote({ ...workRequest, quote: computed } as any);
    toast.success(
      rate === 0
        ? 'No sales tax on this quote.'
        : `Sales tax set to ${(rate * 100).toFixed(2)}% on materials.`,
    );
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
        customerSections: (editedQuote as any).customerSections
          || { materials: true, labor: true, processDetail: true },
        /**
         * Named for the same reason the two prose fields above are: the
         * whole-object spread only covers the line arrays, so a quote-level
         * field that is not listed here is silently discarded on the next
         * load. The schedule is what invoices are raised against, so losing
         * it loses the record of what has already been billed.
         */
        paymentSchedule: (editedQuote as any).paymentSchedule || [],
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
            {/*
              The way in to the estimator panel.

              The panel is on the Quote Details tab, below the fold, inside a
              collapsed section. Every one of those is defensible on its own
              and together they made the feature impossible to find. This
              switches to the tab, opens the panel and scrolls to it.
            */}
            <button
              onClick={openEstimatorPanel}
              title="Write instructions for the AI estimator and re-price the quote"
              className="flex items-center gap-2 rounded-lg border border-purple-500/40 bg-purple-600/10 px-4 py-2 text-sm font-bold text-purple-300 transition-all hover:bg-purple-600/20"
            >
              <Sparkles className="h-4 w-4" />
              Ask the estimator
            </button>
            {/*
              Email it, from here.

              "i want to be able to email a customer right out of this as
              well." The sender already existed — it was inside the PDF
              preview, so emailing meant opening the document first and
              finding a button in its chrome. The step was invisible, which
              made the feature invisible with it.

              Same handler, same customer copy, same invite option. Only the
              way in is new.
            */}
            {workRequest.quote?.id && (
              <button
                onClick={() => setEmailingQuote(true)}
                title="Email this estimate to the customer as a PDF"
                className="flex items-center gap-2 rounded-lg border border-[#ea580c]/40 bg-[#ea580c]/10 px-4 py-2 text-sm font-bold text-[#ea580c] transition-all hover:bg-[#ea580c]/20"
              >
                <Mail className="h-4 w-4" />
                Email customer
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
              <details
                id="quote-estimator-panel"
                className="group rounded-xl border border-gray-700 bg-black/40"
                open={briefOpen || briefEdited}
                onToggle={(e) => setBriefOpen((e.target as HTMLDetailsElement).open)}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#ea580c]" />
                    {/*
                      Named for what you can DO here, not for what it holds.
                      It was "The brief this was priced from", which is a true
                      description of the contents and a useless signpost: it
                      answers a question about the past, so nobody looking to
                      change the estimate opened it.
                    */}
                    <span className="text-sm font-bold text-white">Tell the estimator what to change</span>
                    {briefEdited && (
                      <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                        edited — not yet re-priced
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 group-open:hidden">
                    Write what to change, then re-price
                  </span>
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

                  {/*
                    NOT gated on `hasFullIntake` any more, and that was the bug.

                    "can we please add to the quote editor a place i can write
                    to the ai generator to adjust" — this box already existed
                    and already did exactly that: the server treats the brief
                    as THE most authoritative description of the job and tells
                    the model to follow it wherever it conflicts with anything
                    else it was given.

                    It was hidden on every quote whose work request did not
                    keep a structured intake, which is most of them and all
                    the older ones. So the one field that lets a person
                    overrule the estimator was invisible precisely when the
                    estimator had the least to go on — the exact case where
                    somebody needs to type "the slab is already down, do not
                    price excavation" and have it obeyed.
                  */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-400">
                      Tell the estimator what to do
                    </label>
                    <textarea
                      value={briefDraft.brief || ''}
                      onChange={(e) => setBriefField('brief', e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-[#2A2A2A] bg-[#050505] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                      placeholder="The detail only somebody who saw the job can give, and anything to change: &quot;the slab is already down, do not price excavation&quot;, &quot;allow two days for the stairs&quot;, &quot;customer is supplying the tile&quot;."
                    />
                    <p className="mt-1 text-[11px] text-gray-500">
                      Read as the most authoritative account of the job — where this conflicts with
                      anything else on the record, the estimator follows this. Then press
                      <strong className="text-gray-400"> Re-price from the brief</strong>.
                    </p>
                  </div>

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

                {/*
                  The tax rate, which drove every total on the quote and had
                  no input anywhere.

                  It is stored as a FRACTION (0.0875) and shown as a percent,
                  because that is how it is typed and how it is read. The
                  conversion happens here rather than in the stored value, so
                  nothing downstream — the PDF, the invoice, the schedule —
                  has to guess which form it is holding.

                  Editing it recalculates immediately, the same way changing a
                  quantity does. A rate that is saved but not applied until
                  some later action is a rate somebody will send out wrong.
                */}
                <div className="mt-4 rounded-lg border border-gray-700 bg-black/20 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm font-semibold text-gray-300">Sales tax on materials</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      step="0.01"
                      value={Number((((currentQuote as any).taxRate || 0) * 100).toFixed(4))}
                      onChange={(e) => changeTaxRate(Number(e.target.value))}
                      disabled={savingTax}
                      className="w-24 rounded border border-gray-600 bg-black px-3 py-2 text-right text-sm text-white disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-500">%</span>
                    {savingTax && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                    <span className="ml-auto text-sm text-gray-400">
                      Tax ${(currentQuote.taxAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    Materials only — labour is a service and is not taxed, which is what the
                    estimator, the invoices and the payment schedule all assume. Set it to{' '}
                    <strong className="text-gray-400">0</strong> where the work is not taxable;
                    zero is honoured as a decision, not replaced by a default.
                    {!editMode && ' Saved as soon as you change it.'}
                  </p>
                </div>

                {/*
                  What the home owner is supplying themselves.

                  Eric: "have a spot the write in products and comments that
                  the home owner will be supplying."

                  It existed — as "Customer credits", gated behind edit mode
                  and collapsed inside a <details> under the totals, which is
                  to say it may as well not have. Three changes: it is always
                  present rather than edit-mode only, it opens by default, and
                  it is named for what it is rather than for its accounting
                  treatment. Nobody goes looking for a "credit" when what they
                  have is a customer turning up with their own tiles.
                */}
                {(editMode || (currentQuote as any)?.credits?.length > 0) && (
                  <details open
                    className="mt-6 bg-black/20 border border-emerald-500/30 rounded-lg">
                    <summary className="px-4 py-3 cursor-pointer font-semibold text-emerald-400 hover:bg-emerald-500/10 rounded-t-lg flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Supplied by the home owner ({((editMode ? editedQuote : currentQuote) as any)?.credits?.length || 0})
                    </summary>
                    <div className="p-4 space-y-3">
                      <p className="text-xs text-gray-500">
                        Anything the home owner is buying and bringing themselves — their own
                        flooring, their own fixtures, the tiles they found on offer. It comes off
                        the materials figure, so there is no markup and no sales tax on it, and it
                        stays on the quote as its own line somebody can read a year later.
                      </p>

                      {!editMode && !((currentQuote as any)?.credits || []).length && (
                        <p className="text-sm text-gray-600">Nothing recorded yet.</p>
                      )}

                      {/*
                        Read-only outside edit mode rather than hidden.
                        Somebody checking a quote before it goes out needs to
                        see what the owner is supplying without having to put
                        the quote into edit mode to find out — and putting it
                        into edit mode to look is how a stray keystroke gets
                        saved onto a quote nobody meant to change.
                      */}
                      {!editMode && ((currentQuote as any)?.credits || []).map((credit: any) => (
                        <div key={credit.id} className="rounded-lg border border-emerald-500/20 bg-black/30 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-sm text-white">{credit.description || 'Supplied by the home owner'}</span>
                            <span className="shrink-0 text-sm font-semibold text-emerald-300">
                              −${(Number(credit.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          {credit.reason && (
                            <p className="mt-1 text-xs text-emerald-200/60">{credit.reason}</p>
                          )}
                        </div>
                      ))}

                      {editMode && (editedQuote?.credits || []).map(credit => (
                        <div key={credit.id} className="bg-black/30 border border-emerald-500/20 rounded-lg p-3 space-y-2">
                          <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 8rem 2rem' }}>
                            <input
                              value={credit.description}
                              onChange={e => updateCredit(credit.id, 'description', e.target.value)}
                              placeholder="What they are supplying — e.g. hardwood flooring"
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
                              aria-label="Remove this item">
                              <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-400" />
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {/*
                              Taking one of these off the quote puts the cost
                              BACK ON US — the owner is no longer supplying it,
                              so we are. The total goes UP, which is the
                              opposite of every other toggle on this screen and
                              worth saying out loud next to the button.
                            */}
                            <IncludeToggle
                              on={credit.included !== false}
                              onToggle={() => updateCredit(credit.id, 'included' as any, credit.included === false)}
                              noun="item"
                            />
                            <span className="text-[11px] text-gray-500">
                              {credit.included === false
                                ? 'Not deducted — we are supplying this after all, so the total goes up.'
                                : 'Deducted from the bill.'}
                            </span>
                          </div>
                          {/*
                            The comment. Eric asked for "products AND comments"
                            — this is the comments half, and it is the field
                            that stops a conversation six months later being
                            one person's memory against another's.
                          */}
                          <input
                            value={credit.reason || ''}
                            onChange={e => updateCredit(credit.id, 'reason', e.target.value)}
                            placeholder="Notes — e.g. bought their own at Home Depot, receipt on file, delivering week 2"
                            className="w-full bg-transparent border-b border-emerald-500/20 px-1 py-1 text-xs text-emerald-200/70 placeholder-gray-700 focus:outline-none focus:border-emerald-500/50" />
                        </div>
                      ))}

                      {editMode && (
                        <button onClick={addCredit}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/10 transition">
                          <Plus className="w-4 h-4" /> Add something they are supplying
                        </button>
                      )}

                      {(editedQuote?.totalCost || 0) < 0 && (
                        <p className="text-xs text-amber-400">
                          What the home owner is supplying comes to more than the work. This quote
                          is in their favour — worth a second look before it goes out.
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
                <div className="flex flex-wrap gap-2 mb-4">
                  {/*
                    First, and the default, because it is the view that lets
                    you CHECK a quote. Materials and Labour on their own are
                    for entering lines; this is for making sure the money
                    under each process is right, which is what somebody is
                    actually doing when they open a generated quote.
                  */}
                  <button
                    onClick={() => setQuoteEditTab('phases')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                      quoteEditTab === 'phases'
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                        : 'bg-black border border-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    By process ({phaseBreakdown.groups.length})
                    {phaseBreakdown.untagged.any && (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                        {phaseBreakdown.untagged.mats.length + phaseBreakdown.untagged.labs.length} loose
                      </span>
                    )}
                  </button>
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

              {/*
                The phase list, shared by every line's phase picker.

                A `datalist` rather than a `select` on purpose: it offers the
                job's own phases without PREVENTING a new one being typed.
                Restricting the field to existing steps would mean a line
                could never be moved to a phase that has not been written up
                yet, which is exactly when somebody is reorganising a quote.
              */}
              <datalist id="quote-phase-options">
                {phaseOptions.map((phase) => <option key={phase} value={phase} />)}
              </datalist>

              {/* ── One process, its materials, its labour, all editable ──── */}
              {(!editMode || quoteEditTab === 'phases') && (
                <div className="bg-black/40 border border-gray-700 rounded-xl p-6 space-y-4">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                      <Layers className="h-5 w-5 text-orange-400" />
                      Build the quote by process
                    </h3>
                    <p className="mt-1 text-sm text-gray-400">
                      {editMode
                        ? 'Each stage holds its own materials and labour. Add, remove and adjust them here and the stage total, and the quote total, follow.'
                        : 'What each stage of the job is made of and what it comes to. Press Edit Quote to add, remove or adjust lines inside a stage.'}
                      {phaseBreakdown.withMarkup && ' "Ours" is your markup on that stage, and is never on the customer copy.'}
                    </p>
                  </div>

                  {(() => {
                    const cash = (n) => '$' + (Number(n) || 0).toFixed(2);
                    const num = 'w-16 rounded border border-gray-700 bg-black px-1.5 py-1 text-right text-xs text-white';
                    const txt = 'min-w-0 flex-1 rounded border border-gray-700 bg-black px-2 py-1 text-xs text-white';

                    /**
                     * One priced line, editable in place.
                     *
                     * Eric: "put the materials and labor cost in each section so
                     * we can add or subtract or adjust within that line item so
                     * it will build out the total cost." The first version of
                     * this screen only READ the lines, which answered a question
                     * he had not asked — he wants to work here, not just check.
                     */
                    /**
                     * CALLED, NOT MOUNTED — and that is the whole point.
                     *
                     * This was `const Row = ({row, kind}) => ...` used as
                     * `<Row />`. A component declared in a render body is a
                     * NEW COMPONENT TYPE on every render, so React throws the
                     * old tree away and mounts a fresh one rather than
                     * updating it. The DOM input is destroyed and rebuilt on
                     * every keystroke, so focus lands back on the page and you
                     * can type exactly one character before having to click
                     * the box again.
                     *
                     * Returning the elements from a plain function inlines
                     * them into the parent's tree, where identity is position
                     * and key. The inputs are then updated rather than
                     * replaced, and they keep focus and caret.
                     *
                     * The same fault, in the same file, is why `IncludeToggle`
                     * had to be hoisted to module level. I reintroduced it one
                     * screen later, this time around text fields, where it is
                     * not a performance note but an unusable form.
                     */
                    const renderRow = (row: any, kind: any) => {
                      const off = row?.included === false;
                      const hidden = row?.visible === false;
                      const mat = kind === 'materials';
                      /* One updater for both kinds, so the row is written once.
                         Typed loosely on purpose: the two field unions have
                         almost nothing in common, and narrowing to their
                         intersection would reject every field a row edits. */
                      const update: (id: string, field: any, value: any) => void =
                        mat ? updateMaterial : updateLabor;
                      const remove = mat ? deleteMaterial : deleteLabor;
                      const name = mat
                        ? (row?.name || row?.description || 'Material')
                        : (row?.role || row?.description || 'Labour');
                      const qty = mat ? Number(row?.quantity) || 0 : Number(row?.hours) || 0;
                      const unit = mat ? (row?.unit || 'unit') : 'hrs';
                      const rate = mat
                        ? Number(row?.unitCost ?? row?.unitPrice) || 0
                        : Number(row?.hourlyRate) || 0;

                      if (!editMode) {
                        return (
                          <div key={row.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-[#1f1f1f] bg-[#070707] px-2.5 py-1.5 ${off ? 'opacity-50' : ''}`}>
                            <span className="min-w-0 flex-1 truncate text-xs text-gray-200">{name}</span>
                            <span className="flex-shrink-0 text-[11px] text-gray-500">{qty} {unit} &times; {cash(rate)}</span>
                            {off && <span className="flex-shrink-0 rounded bg-gray-700/40 px-1.5 text-[10px] font-bold uppercase text-gray-400">off quote</span>}
                            {!off && hidden && <span className="flex-shrink-0 rounded bg-amber-500/15 px-1.5 text-[10px] font-bold uppercase text-amber-400">hidden</span>}
                            <span className={`flex-shrink-0 text-xs font-semibold ${off ? 'text-gray-500 line-through' : 'text-white'}`}>
                              {cash(phaseBreakdown.lineTotal(row))}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div key={row.id} className={`rounded border border-[#1f1f1f] bg-[#070707] p-2 ${off ? 'opacity-60' : ''}`}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <input
                              type="text"
                              value={mat ? (row?.name || '') : (row?.role || '')}
                              onChange={(e) => update(row.id, mat ? 'name' : 'role', e.target.value)}
                              className={txt}
                              placeholder={mat ? 'Material' : 'Role'}
                            />
                            <input
                              type="number"
                              value={qty}
                              onChange={(e) => update(row.id, mat ? 'quantity' : 'hours', Number(e.target.value))}
                              className={num}
                              title={mat ? 'Quantity' : 'Hours'}
                            />
                            {mat ? (
                              <input
                                type="text"
                                value={row?.unit || ''}
                                onChange={(e) => update(row.id, 'unit', e.target.value)}
                                className="w-16 rounded border border-gray-700 bg-black px-1.5 py-1 text-xs text-white"
                                placeholder="unit"
                              />
                            ) : (
                              <span className="w-16 px-1.5 text-xs text-gray-500">hrs</span>
                            )}
                            <input
                              type="number"
                              value={rate}
                              onChange={(e) => update(row.id, mat ? 'unitCost' : 'hourlyRate', Number(e.target.value))}
                              className={num}
                              title={mat ? 'Unit cost' : 'Hourly rate'}
                            />
                            <span className={`w-20 flex-shrink-0 text-right text-xs font-bold ${off ? 'text-gray-500 line-through' : 'text-white'}`}>
                              {cash(phaseBreakdown.lineTotal(row))}
                            </span>
                            <button
                              type="button"
                              onClick={() => remove(row.id)}
                              title="Remove this line from the quote entirely"
                              className="flex-shrink-0 rounded border border-red-500/40 p-1 text-red-400 hover:border-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <IncludeToggle
                              on={!off}
                              onToggle={() => update(row.id, 'included', off)}
                              noun={mat ? 'material' : 'labour line'}
                            />
                            <button
                              type="button"
                              onClick={() => update(row.id, 'visible', hidden)}
                              disabled={off}
                              title={off
                                ? 'This line is off the quote, so there is nothing to show or hide.'
                                : hidden ? 'Hidden from the customer. Click to show it.'
                                  : 'Shown to the customer. Click to hide the line — it is still charged.'}
                              className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                hidden
                                  ? 'border border-amber-500/40 bg-amber-500/10 text-amber-400'
                                  : 'border border-blue-500/30 bg-blue-500/5 text-blue-300'
                              }`}
                            >
                              {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              {hidden ? 'Hidden' : 'Shown'}
                            </button>
                            <input
                              type="text"
                              list="quote-phase-options"
                              value={row?.phase || ''}
                              onChange={(e) => update(row.id, 'phase', e.target.value)}
                              className="w-40 rounded border border-gray-700 bg-black px-2 py-1 text-[11px] text-white"
                              placeholder="move to process..."
                            />
                            <input
                              type="text"
                              value={row?.description || ''}
                              onChange={(e) => update(row.id, 'description', e.target.value)}
                              className="min-w-0 flex-1 rounded border border-gray-700 bg-black px-2 py-1 text-[11px] text-white"
                              placeholder="Description the customer reads"
                            />
                          </div>
                        </div>
                      );
                    };

                    /* `phase` is absent for the untagged bucket, which is how
                       it knows not to offer an "add into this process" button
                       for a process that does not exist. */
                    const renderBucket = ({ label, rows, total, kind, tint, phase }: any) => (
                      <div>
                        <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide">
                          <span className={tint}>{label} ({rows.length})</span>
                          <span className="text-gray-300">{cash(total)}</span>
                        </div>
                        {rows.length === 0 && (
                          <p className="mb-1 text-[11px] italic text-gray-600">none in this process</p>
                        )}
                        <div className="space-y-1">
                          {rows.map((r: any) => renderRow(r, kind))}
                        </div>
                        {editMode && phase !== undefined && (
                          <button
                            type="button"
                            onClick={() => (kind === 'materials' ? addMaterial(phase) : addLabor(phase))}
                            className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-gray-700 py-1 text-[11px] font-semibold text-gray-400 transition hover:border-gray-500 hover:text-white"
                          >
                            <Plus className="h-3 w-3" />
                            Add {kind === 'materials' ? 'material' : 'labour'} to this process
                          </button>
                        )}
                      </div>
                    );

                    return (
                      <div className="space-y-3">
                        {phaseBreakdown.groups.map((g) => (
                          <div
                            key={g.phase}
                            className={`rounded-lg border p-3 ${g.empty && !editMode ? 'border-amber-500/30 bg-amber-500/[0.04]' : 'border-gray-800 bg-black/40'}`}
                          >
                            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-800 pb-2">
                              <span className="text-sm font-bold text-white">{g.phase}</span>
                              <span className="text-base font-bold text-orange-400">{cash(g.subtotal)}</span>
                            </div>
                            {g.empty && !editMode ? (
                              /* Shown rather than hidden: a process with nothing tagged
                                 to it is the fault this screen exists to surface. The
                                 document drops empty phases; doing that here would hide
                                 the very thing somebody came to look for. In edit mode
                                 the Add buttons appear instead, because then the useful
                                 response is to fill it rather than to be told. */
                              <p className="text-xs text-amber-300">
                                Nothing is tagged to this process. It will not appear on the quote, and any
                                work it covers is either billed under another heading or not at all.
                              </p>
                            ) : (
                              <div className="grid gap-3 sm:grid-cols-2">
                                {renderBucket({ label: 'Materials', rows: g.mats, total: g.matTotal, kind: 'materials', tint: 'text-blue-400', phase: g.phase })}
                                {renderBucket({ label: 'Labour', rows: g.labs, total: g.labTotal, kind: 'labor', tint: 'text-purple-400', phase: g.phase })}
                                {/*
                                  Soft costs that belong to this process —
                                  trash removal, chiefly. Read-only here:
                                  they are edited where soft costs live, and
                                  `renderRow` is built around a material or
                                  a labour line. They are SHOWN because they
                                  are in the subtotal above, and a subtotal
                                  you cannot add up from the rows under it
                                  reads as an arithmetic bug.
                                */}
                                {g.softs.length > 0 && (
                                  <div>
                                    <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide">
                                      <span className="text-emerald-400">Other ({g.softs.length})</span>
                                      <span className="text-gray-300">{cash(g.softTotal)}</span>
                                    </div>
                                    <div className="space-y-1">
                                      {g.softs.map((a: any) => (
                                        <div key={a.id || a.name} className="flex items-baseline justify-between gap-2 rounded bg-black/40 px-2 py-1">
                                          <span className="text-[11px] text-gray-300">{a.name || 'Additional cost'}</span>
                                          <span className="text-[11px] font-semibold text-gray-200">{cash(phaseBreakdown.lineTotal(a))}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {phaseBreakdown.withMarkup && !g.empty && (
                              <div className="mt-2 flex items-center justify-between border-t border-gray-800 pt-1.5 text-[11px]">
                                <span className="text-gray-500">Ours on this process &middot; {phaseBreakdown.rateLabel}</span>
                                <span className="font-semibold text-emerald-400">{cash(g.markup)}</span>
                              </div>
                            )}
                          </div>
                        ))}

                        {phaseBreakdown.untagged.any && (
                          <div className="rounded-lg border border-amber-500/40 bg-amber-500/[0.06] p-3">
                            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 border-b border-amber-500/20 pb-2">
                              <span className="text-sm font-bold text-amber-300">Not tagged to a process</span>
                              <span className="text-base font-bold text-amber-300">{cash(phaseBreakdown.untagged.subtotal)}</span>
                            </div>
                            <p className="mb-2 text-xs text-amber-200/80">
                              These are charged, but they land in a loose &quot;Additional items&quot; group at the
                              bottom of the customer quote with no process to explain them
                              {editMode ? ' \u2014 type a process on any line to move it.' : '. Use Edit Quote to move them.'}
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {renderBucket({ label: 'Materials', rows: phaseBreakdown.untagged.mats, total: phaseBreakdown.untagged.matTotal, kind: 'materials', tint: 'text-blue-400' })}
                              {renderBucket({ label: 'Labour', rows: phaseBreakdown.untagged.labs, total: phaseBreakdown.untagged.labTotal, kind: 'labor', tint: 'text-purple-400' })}
                            </div>
                          </div>
                        )}

                        {/* The sum of the parts, where somebody can see it add up. */}
                        <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-gray-700 bg-black/60 px-3 py-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                            All processes
                          </span>
                          <span className="text-lg font-bold text-white">
                            {cash(
                              phaseBreakdown.groups.reduce((t, g) => t + g.subtotal, 0)
                              + phaseBreakdown.untagged.subtotal,
                            )}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          Direct cost of every line on the quote. Overhead, profit, contingency and tax
                          are added on top &mdash; see the quote total below.
                        </p>

                        {!phaseBreakdown.groups.length && !phaseBreakdown.untagged.any && (
                          <p className="text-sm text-gray-500">
                            No priced lines yet. Write the job&apos;s processes on the Process tab, then add
                            materials and labour into each one.
                          </p>
                        )}
                      </div>
                    );
                  })()}
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
                          onClick={() => addMaterial()}
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
                            {/*
                              The two fields that had no input anywhere.

                              Phase decides which invoice this line is billed
                              on, so leaving it uneditable meant an estimator's
                              mistake was permanent. Description is what the
                              customer actually reads next to the price — the
                              name alone is often just "Lumber".
                            */}
                            <input
                              type="text"
                              list="quote-phase-options"
                              value={material.phase || ''}
                              onChange={(e) => updateMaterial(material.id, 'phase' as any, e.target.value)}
                              className="col-span-2 bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Phase — which stage of the job"
                            />
                            <input
                              type="text"
                              value={material.description || ''}
                              onChange={(e) => updateMaterial(material.id, 'description', e.target.value)}
                              className="col-span-4 bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Description — what the customer reads"
                            />
                            <div className="col-span-6 flex flex-wrap items-center gap-2">
                              <IncludeToggle
                                on={material.included !== false}
                                onToggle={() => updateMaterial(material.id, 'included' as any, material.included === false)}
                                noun="material"
                              />
                              {material.included === false && (
                                <span className="text-[11px] text-gray-500">Not charged — the total drops by this amount.</span>
                              )}
                              {material.included !== false && material.visible === false && (
                                <span className="text-[11px] text-amber-400/80">Charged, but the customer does not see the line.</span>
                              )}
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
                        onClick={() => addLabor()}
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
                            {/* Same two fields the materials gained, and for
                                the same reasons — see the note there. */}
                            <input
                              type="text"
                              list="quote-phase-options"
                              value={labor.phase || ''}
                              onChange={(e) => updateLabor(labor.id, 'phase' as any, e.target.value)}
                              className="col-span-2 bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Phase — which stage of the job"
                            />
                            <input
                              type="text"
                              value={labor.description || ''}
                              onChange={(e) => updateLabor(labor.id, 'description', e.target.value)}
                              className="col-span-3 bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                              placeholder="Description — what this covers"
                            />
                            <div className="col-span-5 flex flex-wrap items-center gap-2">
                              <IncludeToggle
                                on={labor.included !== false}
                                onToggle={() => updateLabor(labor.id, 'included' as any, labor.included === false)}
                                noun="labour line"
                              />
                              {labor.included === false && (
                                <span className="text-[11px] text-gray-500">Not charged — the total drops by this amount.</span>
                              )}
                              {labor.included !== false && labor.visible === false && (
                                <span className="text-[11px] text-amber-400/80">Charged, but the customer does not see the line.</span>
                              )}
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
                How much of the breakdown the customer is shown.

                Sits above the internal notes because they are the same kind
                of decision — what leaves the building — and a person thinking
                about one is thinking about the other.

                The guarantee is the server's: in phase-totals mode
                customerQuoteView sends no materials or labour at all, so
                there is nothing in the customer's browser to find. This
                control only records the choice.
              */}
              {(!editMode || quoteEditTab === 'process') && (
                <div className="rounded-xl border border-gray-700 bg-black/40 p-6">
                  <h4 className="mb-1 flex items-center gap-2 text-lg font-bold text-white">
                    <Eye className="h-5 w-5 text-blue-400" />
                    What the customer sees
                  </h4>
                  <p className="mb-4 text-sm text-gray-400">
                    Materials and Labour cycle through three states: <strong className="text-blue-300">in
                    full</strong> with quantities and rates, <strong className="text-emerald-300">lines
                    and costs only</strong> — every item listed with what it comes to, but no
                    quantities and no rates to work your pricing back from — or{' '}
                    <strong className="text-amber-400">not sent at all</strong>. The phases, their
                    written detail and what each one costs show throughout, because that is what
                    the customer is agreeing to. Hidden either way: anything you have unticked
                    line by line, and your internal notes.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {([
                      ['materials', 'Materials', 'Each material and what it costs.'],
                      ['labor', 'Labour', 'Each role and what it costs.'],
                      ['processDetail', 'Process detail', 'The written account of each phase. The phase name and price stay either way.'],
                    ] as Array<[string, string, string]>).map(([key, label, blurb]) => {
                      const current = (editedQuote as any)?.customerSections
                        || { materials: true, labor: true, processDetail: true };
                      const rawMode = current[key];
                      const mode = rawMode === false || rawMode === 'off' ? 'off'
                        : rawMode === 'no-rates' ? 'no-rates' : 'full';
                      const on = mode !== 'off';
                      /* Process detail has no middle state — there is no half
                         a paragraph. Only the two line sections cycle. */
                      const threeWay = key !== 'processDetail';
                      const state = !threeWay
                        ? (on ? { text: 'Shown to the customer', tone: 'text-blue-300' }
                              : { text: 'Not sent at all', tone: 'text-amber-400' })
                        : mode === 'full'
                          ? { text: 'Shown in full, with quantities and rates', tone: 'text-blue-300' }
                          : mode === 'no-rates'
                            ? { text: 'Lines and costs — no quantities, no rates', tone: 'text-emerald-300' }
                            : { text: 'Not sent at all', tone: 'text-amber-400' };
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleCustomerSection(key as 'materials' | 'labor' | 'processDetail')}
                          disabled={savingSections}
                          className={`rounded-lg border p-3 text-left transition disabled:opacity-60 ${
                            mode === 'full'
                              ? 'border-blue-500/60 bg-blue-500/10'
                              : mode === 'no-rates'
                                ? 'border-emerald-500/60 bg-emerald-500/10'
                                : 'border-[#2A2A2A] bg-[#111] hover:border-blue-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] font-bold ${
                              mode === 'full' ? 'border-blue-400 bg-blue-400 text-black'
                                : mode === 'no-rates' ? 'border-emerald-400 bg-emerald-400 text-black'
                                  : 'border-gray-600 text-transparent'
                            }`}>{mode === 'no-rates' ? '~' : '✓'}</span>
                            <span className="text-sm font-bold text-white">{label}</span>
                          </div>
                          <p className="mt-1 text-xs text-gray-400">{blurb}</p>
                          <p className={`mt-1.5 text-[11px] font-semibold ${state.tone}`}>
                            {state.text}
                          </p>
                          {threeWay && (
                            <p className="mt-0.5 text-[10px] text-gray-600">click to cycle</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    Turning a section off removes it from what the customer is sent — it is not
                    hidden in their browser. Costs stay in the phase totals either way.
                  </p>

                  {/*
                    One line at a time.

                    The switches above are all-or-nothing. This is the other
                    half of the same question — "don't show them THAT one" —
                    and it had no answer outside edit mode.

                    A line is listed here greyed out when its whole section is
                    already off, rather than hidden: otherwise switching
                    Materials off would make every per-line choice you had
                    made disappear from the screen, and it is not obvious that
                    they are still remembered underneath.
                  */}
                  {(() => {
                    const q: any = currentQuote || {};
                    const groups: Array<['materials' | 'labor', string, any[]]> = [
                      ['materials', 'Materials', Array.isArray(q.materials) ? q.materials : []],
                      ['labor', 'Labour', Array.isArray(q.labor) ? q.labor : []],
                    ];
                    const sectionOn = (editedQuote as any)?.customerSections
                      || { materials: true, labor: true, processDetail: true };
                    if (!groups.some(([, , rows]) => rows.length)) return null;
                    return (
                      <div className="mt-5 border-t border-gray-800 pt-4">
                        <h5 className="mb-1 text-sm font-bold text-white">Or pick them one at a time</h5>
                        <p className="mb-3 text-xs text-gray-400">
                          A hidden line is <strong className="text-amber-400/90">still charged</strong> — it
                          stays in its phase total, the customer just does not see it listed. To take work
                          off the quote altogether, use <em>Edit Quote</em> and switch it off there.
                        </p>
                        <div className="space-y-4">
                          {groups.map(([kind, label, rows]) => rows.length === 0 ? null : (
                            <div key={kind}>
                              <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                                {label}
                                {sectionOn[kind] === false && (
                                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-400 normal-case">
                                    whole section is off
                                  </span>
                                )}
                              </div>
                              <div className={`space-y-1 ${sectionOn[kind] === false ? 'opacity-50' : ''}`}>
                                {rows.map((row: any) => {
                                  const on = row?.visible !== false;
                                  const off = row?.included === false;
                                  const name = kind === 'materials'
                                    ? (row?.name || row?.description || 'Material')
                                    : (row?.role || row?.description || 'Labour');
                                  return (
                                    <button
                                      key={row?.id}
                                      type="button"
                                      onClick={() => toggleLineVisible(kind, String(row?.id))}
                                      disabled={savingLine === row?.id || off}
                                      title={off
                                        ? 'This line is off the quote entirely, so there is nothing to show or hide.'
                                        : on
                                          ? 'Shown to the customer. Click to hide the line — it is still charged.'
                                          : 'Hidden from the customer. Click to show it.'}
                                      className={`flex w-full items-center gap-2 rounded border px-2.5 py-1.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                        on
                                          ? 'border-[#2A2A2A] bg-[#0B0B0B] hover:border-blue-500/40'
                                          : 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50'
                                      }`}
                                    >
                                      {on
                                        ? <Eye className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
                                        : <EyeOff className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />}
                                      <span className="flex-1 truncate text-xs text-gray-200">{name}</span>
                                      {row?.phase && (
                                        <span className="hidden flex-shrink-0 text-[10px] text-gray-500 sm:inline">
                                          {row.phase}
                                        </span>
                                      )}
                                      <span className="flex-shrink-0 text-xs font-semibold text-white">
                                        ${(Number(row?.totalCost) || 0).toFixed(2)}
                                      </span>
                                      <span className={`flex-shrink-0 text-[10px] font-bold uppercase ${
                                        off ? 'text-gray-600' : on ? 'text-blue-300' : 'text-amber-400'
                                      }`}>
                                        {off ? 'off quote' : on ? 'shown' : 'hidden'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/*
                The payment schedule.

                "the invoices should be built off the payment schedule" — so
                it has to exist as real data before an invoice can be built
                off it, and until now it did not. `paymentSchedule` appeared
                in five browser files and zero server ones, written only by
                the seed fixtures, so every schedule panel in the app was
                rendering demo data and nothing else.

                Draws are per phase because a phase is something the customer
                can see finished. The arithmetic lives in `paymentSchedule.ts`,
                tested against four thousand randomised contracts for the one
                property that matters: the draws sum to the contract exactly.
              */}
              {(!editMode || quoteEditTab === 'process') && (
                <div className="rounded-xl border border-gray-700 bg-black/40 p-6">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                    <h4 className="flex items-center gap-2 text-lg font-bold text-white">
                      <CalendarDays className="h-5 w-5 text-emerald-400" />
                      Payment schedule
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs font-semibold text-gray-400">Deposit</label>
                      <input
                        type="number"
                        min={depositFloorPct}
                        max={100}
                        value={depositPct}
                        onChange={(e) => {
                          const typed = Math.round(Number(e.target.value) || 0);
                          setDepositPctOverride(Math.min(100, Math.max(depositFloorPct, typed)));
                        }}
                        title={`The company minimum is ${depositFloorPct}%`}
                        className="w-16 rounded-lg border border-[#2A2A2A] bg-[#111] px-2 py-1.5 text-right text-sm text-white focus:border-emerald-500/50 focus:outline-none"
                      />
                      <span className="text-xs text-gray-500">% (min {depositFloorPct})</span>

                      <label className="ml-2 text-xs font-semibold text-gray-400">Payments</label>
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1, availablePhaseCount)}
                        value={paymentCount}
                        onChange={(e) => {
                          const typed = Math.round(Number(e.target.value) || 1);
                          setPaymentCountOverride(
                            Math.min(Math.max(1, availablePhaseCount), Math.max(1, typed)),
                          );
                        }}
                        title="How many payments after the deposit. Fewer merges neighbouring phases."
                        className="w-14 rounded-lg border border-[#2A2A2A] bg-[#111] px-2 py-1.5 text-right text-sm text-white focus:border-emerald-500/50 focus:outline-none"
                      />
                      <span className="text-xs text-gray-500">
                        after the deposit{availablePhaseCount ? ` (max ${availablePhaseCount})` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={addDraw}
                        disabled={savingSchedule}
                        className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-1.5 text-xs font-bold text-gray-300 transition hover:border-gray-500 hover:text-white disabled:opacity-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add payment
                      </button>
                      {/*
                        Two-step once a schedule exists, because rebuilding
                        DISCARDS a schedule somebody wrote by hand. An
                        accidental click on a job with a negotiated payment
                        plan would replace it with a draw per phase and there
                        is no undo.
                      */}
                      <button
                        type="button"
                        onClick={() => {
                          if (paymentSchedule.length && !confirmingRebuild) { setConfirmingRebuild(true); return; }
                          setConfirmingRebuild(false);
                          void regenerateSchedule();
                        }}
                        /*
                          It used to disarm on BLUR, which made the button
                          unclickable in a way nobody could see. Arming is a
                          state change, so anything that takes focus between
                          the two clicks — the deposit field, the payments
                          field, a toast, a re-render that remounts this
                          subtree — silently put it back to "Rebuild". The
                          next click re-armed it rather than confirming, and
                          you could go round that loop forever while the
                          button did nothing at all.

                          It disarms on a timer instead: still safe, because
                          the confirmation lapses on its own rather than
                          sitting armed, and no longer cancelled by looking
                          at the field next to it. The timer lives in an
                          effect so it is cleared on unmount.
                        */
                        disabled={savingSchedule}
                        title={paymentSchedule.length
                          ? 'Replaces the whole schedule with one draw per phase'
                          : 'Builds a deposit and one draw per phase'}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                          confirmingRebuild
                            ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                            : 'border-emerald-500/40 bg-emerald-600/10 text-emerald-300 hover:bg-emerald-600/20'
                        }`}
                      >
                        {savingSchedule
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <RefreshCw className="h-3.5 w-3.5" />}
                        {!paymentSchedule.length
                          ? 'Build from phases'
                          : confirmingRebuild ? 'Replace the schedule?' : 'Rebuild'}
                      </button>
                    </div>
                  </div>
                  <p className="mb-4 text-sm text-gray-400">
                    Set the deposit and how many payments follow it, then build — fewer payments
                    than phases merges neighbouring stages, so three payments across seven phases
                    become three progress payments, each released by a milestone the customer can
                    see finished. Or write your own from scratch with <strong>Add payment</strong>.
                    Edit any line, tie it to the phase whose completion triggers it, and reorder
                    them. Invoices are raised against these.
                  </p>

                  {!paymentSchedule.length ? (
                    <div className="rounded-lg border border-dashed border-[#2A2A2A] bg-[#0A0A0A] p-5 text-center">
                      <p className="text-sm text-gray-400">No schedule yet.</p>
                      <p className="mt-1 text-xs text-gray-600">
                        Build one from the phases on this quote — set the deposit first and the
                        rest follows from the phase prices — or press <strong>Add payment</strong> and
                        write your own.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-hidden rounded-lg border border-[#2A2A2A]">
                        {paymentSchedule.map((draw, i) => (
                          <div
                            key={draw.id}
                            className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
                              i % 2 ? 'bg-[#0D0D0D]' : 'bg-[#111]'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {draw.status === 'pending' ? (
                                  <input
                                    type="text"
                                    value={draw.label}
                                    onChange={(e) => updateDraw(draw.id, 'label', e.target.value)}
                                    className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-bold text-white hover:border-gray-700 focus:border-emerald-500/50 focus:bg-black focus:outline-none"
                                    placeholder="What this payment is called"
                                  />
                                ) : (
                                  <span className="text-sm font-bold text-white">{draw.label}</span>
                                )}
                                {draw.status !== 'pending' && (
                                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                    draw.status === 'paid'
                                      ? 'bg-emerald-500/15 text-emerald-300'
                                      : 'bg-blue-500/15 text-blue-300'
                                  }`}>
                                    {draw.status}
                                  </span>
                                )}
                              </div>
                              {draw.status === 'pending' ? (
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  {/*
                                    A datalist, not a select: the phases of the
                                    job are the useful answers, but "on signing"
                                    and "14 days after start" are real triggers
                                    too and a closed list would forbid them.
                                    Leaving it blank unties the draw from any
                                    phase, which is what a deposit or a
                                    negotiated date payment wants.
                                  */}
                                  <input
                                    type="text"
                                    list="quote-phase-options"
                                    value={draw.phase || ''}
                                    onChange={(e) => updateDraw(draw.id, 'phase', e.target.value)}
                                    className="w-44 rounded border border-gray-700 bg-black px-2 py-1 text-[11px] text-white"
                                    placeholder="tie to a phase (optional)"
                                    title="Completing this phase makes the draw due"
                                  />
                                  <input
                                    type="text"
                                    value={draw.trigger}
                                    onChange={(e) => updateDraw(draw.id, 'trigger', e.target.value)}
                                    className="min-w-0 flex-1 rounded border border-gray-700 bg-black px-2 py-1 text-[11px] text-gray-300"
                                    placeholder="When this becomes payable"
                                  />
                                </div>
                              ) : (
                                <p className="mt-0.5 text-xs text-gray-500">{draw.trigger}</p>
                              )}
                            </div>
                            <div className="text-right">
                              {draw.status === 'pending' ? (
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-sm font-bold text-gray-500">$</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={draw.amount}
                                    onChange={(e) => updateDraw(draw.id, 'amount', e.target.value)}
                                    className="w-28 rounded border border-gray-700 bg-black px-2 py-1 text-right text-sm font-bold text-white focus:border-emerald-500/50 focus:outline-none"
                                  />
                                  {/*
                                    The share of the contract, because that is
                                    how a payment plan is negotiated out loud —
                                    "a third up front" — and it is the figure
                                    nobody wants to work out by hand each time
                                    they nudge an amount.
                                  */}
                                  {contractTotal > 0 && (
                                    <span className="w-10 text-right text-[11px] text-gray-500">
                                      {Math.round((draw.amount / contractTotal) * 100)}%
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm font-bold text-white">
                                  ${draw.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              )}
                              {/*
                                Shown only when it says something. The deposit
                                draw has no credit, and repeating "− $0.00
                                deposit" on every row trains people to stop
                                reading the column.
                              */}
                              {draw.type === 'phase' && !!draw.depositCredit && (
                                <p className="mt-0.5 text-[11px] text-gray-600">
                                  phase ${Number(draw.phaseValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  {' '}&minus; ${Number(draw.depositCredit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} deposit
                                </p>
                              )}
                              {draw.status === 'pending' && (
                                <div className="mt-1.5 flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => moveDraw(draw.id, -1)}
                                    disabled={i === 0 || savingSchedule}
                                    title="Move this payment earlier"
                                    className="rounded border border-[#2A2A2A] px-1.5 py-0.5 text-[11px] text-gray-400 transition hover:border-gray-500 hover:text-white disabled:opacity-30"
                                  >
                                    &uarr;
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveDraw(draw.id, 1)}
                                    disabled={i === paymentSchedule.length - 1 || savingSchedule}
                                    title="Move this payment later"
                                    className="rounded border border-[#2A2A2A] px-1.5 py-0.5 text-[11px] text-gray-400 transition hover:border-gray-500 hover:text-white disabled:opacity-30"
                                  >
                                    &darr;
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeDraw(draw.id)}
                                    disabled={savingSchedule}
                                    title="Remove this payment from the schedule"
                                    className="rounded border border-red-500/40 px-1.5 py-0.5 text-red-400 transition hover:border-red-500 hover:bg-red-500/10 disabled:opacity-30"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                              {draw.status === 'pending' && (() => {
                                const steps = (currentQuote as any)?.processSteps || [];
                                const r = drawReadiness(draw, steps);
                                const complete = draw.phase ? isPhaseComplete(steps, draw.phase) : false;
                                return (
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    {draw.phase && (
                                      <button
                                        type="button"
                                        onClick={() => togglePhaseComplete(draw.phase as string)}
                                        disabled={markingPhase === draw.phase}
                                        title={complete
                                          ? `Mark ${draw.phase} as not finished after all`
                                          : `Mark ${draw.phase} finished — this draw becomes due`}
                                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-50 ${
                                          complete
                                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                            : 'border-[#2A2A2A] bg-[#1A1A1A] text-gray-400 hover:border-emerald-500/40 hover:text-emerald-300'
                                        }`}
                                      >
                                        {markingPhase === draw.phase
                                          ? <Loader2 className="h-3 w-3 animate-spin" />
                                          : <CheckCircle2 className="h-3 w-3" />}
                                        {complete ? 'Phase complete' : 'Mark phase complete'}
                                      </button>
                                    )}
                                    {/*
                                      Raising is never BLOCKED by an unfinished
                                      phase. Part-billing a phase that is nearly
                                      done, or taking a payment a customer
                                      offered early, are ordinary things to do.
                                      An unfinished phase makes the draw look
                                      premature; it does not make it wrong.
                                    */}
                                    <button
                                      type="button"
                                      onClick={() => raiseInvoiceForDraw(draw)}
                                      disabled={raisingDraw === draw.id}
                                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-50 ${
                                        r.ready
                                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                                          : 'border-[#2A2A2A] bg-[#1A1A1A] text-gray-400 hover:border-gray-500 hover:text-gray-200'
                                      }`}
                                    >
                                      {raisingDraw === draw.id
                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                        : <Send className="h-3 w-3" />}
                                      {r.ready ? 'Raise invoice' : 'Raise early'}
                                    </button>
                                    <span className={`text-[11px] ${r.ready ? 'text-emerald-400/80' : 'text-gray-500'}`}>
                                      {r.note}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/*
                        The check that matters, shown rather than assumed.

                        The draws are built to sum to the contract exactly and
                        that is tested — but the schedule is STORED, so after
                        an edit to the figures a saved schedule can legitimately
                        no longer match, and that is precisely when somebody
                        needs telling. Silence here would mean the first person
                        to notice the gap is the customer.
                      */}
                      {(() => {
                        const drawn = scheduleTotal(paymentSchedule);
                        const gap = Math.round((drawn - contractTotal) * 100) / 100;
                        const fmt = (n: number) =>
                          n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        return gap === 0 ? (
                          <p className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            The draws add up to the contract total of ${fmt(contractTotal)}.
                          </p>
                        ) : (
                          <p className="mt-3 flex items-start gap-2 text-xs text-amber-400">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>
                              This schedule bills ${fmt(drawn)} against a contract of
                              {' '}${fmt(contractTotal)} — a difference of ${fmt(Math.abs(gap))}.
                              The quote has changed since the schedule was built. Rebuild it
                              before raising any more invoices.
                            </span>
                          </p>
                        );
                      })()}
                    </>
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
                              {/*
                                Renaming a phase moves its lines and its draw
                                with it — on blur, not per keystroke. See
                                `commitPhaseRename` for why the committed
                                value is the only safe moment.
                              */}
                              <input
                                type="text"
                                value={step.title}
                                onChange={(e) => updateProcessStep(step.id, 'title', e.target.value)}
                                onFocus={() => beginPhaseRename(step.id, step.title)}
                                onBlur={() => commitPhaseRename(step.id)}
                                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                className="flex-1 bg-black border border-gray-600 rounded px-3 py-2 text-white"
                                placeholder="Step title"
                                title="Renaming this moves its materials, labour and payment with it."
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
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              {/*
                                A phase taken off the quote takes its own
                                lines' billing with it only if those lines are
                                taken off too — this toggle governs the PHASE,
                                not what is priced under it. Dropping the
                                phase while leaving a priced line tagged to it
                                would leave money in the total with no stage
                                on the document to explain it, so the warning
                                below says so rather than silently guessing.
                              */}
                              <IncludeToggle
                                on={(step as any).included !== false}
                                onToggle={() => updateProcessStep(step.id, 'included' as any, (step as any).included === false)}
                                noun="phase"
                              />
                              {(step as any).included === false && (
                                <span className="text-[11px] text-gray-500">
                                  Off the quote. Any priced lines still tagged to it are
                                  {' '}<strong className="text-amber-400/90">still charged</strong> — take those off too.
                                </span>
                              )}
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
                                void persistQuotePatch({
                                  contractTypeSelected: updated.contractTypeSelected,
                                  selectedContractType: updated.selectedContractType,
                                });
                                syncQuote({ ...workRequest, quote: updated });
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
                                void persistQuotePatch({
                                  contractTypeSelected: updated.contractTypeSelected,
                                  selectedContractType: updated.selectedContractType,
                                });
                                syncQuote({ ...workRequest, quote: updated });
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
                                void persistQuotePatch({
                                  contractTypeSelected: updated.contractTypeSelected,
                                  selectedContractType: updated.selectedContractType,
                                });
                                syncQuote({ ...workRequest, quote: updated });
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
        The quote as a PDF — the real one, not an HTML lookalike.

        This rendered `QuoteDocument` while Download produced a different
        layout entirely, so the preview was the old flat list with no logo and
        the new document existed only inside the saved file. Eric clicked View
        and saw the wrong thing: the two-renderings problem this work set out
        to remove, reintroduced one layer up.

        Showing the generated PDF itself makes preview, print and download the
        same bytes. There is no second layout left to drift.
      */}
      {previewDoc && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black/80 p-4">
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#111]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2A2A] bg-[#1A1A1A] px-5 py-3">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-white">Quote PDF</h3>
                {/*
                  Which copy you are looking at. The CUSTOMER copy by
                  default — seeing what they actually receive is the point of
                  having the switches, and Download follows this toggle, so
                  the default is also the one that cannot disclose a withheld
                  line by being attached to an email in a hurry.
                */}
                <div className="flex overflow-hidden rounded-lg border border-[#2A2A2A]">
                  {([[false, 'My copy'], [true, 'Customer copy']] as Array<[boolean, string]>).map(([v, label]) => (
                    <button
                      key={label}
                      onClick={() => setPreviewAsCustomer(v)}
                      className={`px-3 py-1.5 text-xs font-bold transition ${
                        previewAsCustomer === v ? 'bg-[#ea580c] text-white' : 'bg-[#111] text-gray-400 hover:text-white'
                      }`}
                    >
                      {label}
                      {v && withheldCount > 0 && (
                        <span className="ml-1.5 rounded bg-black/30 px-1 py-0.5 text-[10px] font-bold">
                          −{withheldCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { if (previewUrl) window.open(previewUrl, '_blank', 'noopener'); }}
                  className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-1.5 text-xs font-bold text-gray-300 hover:text-white"
                >
                  <Printer className="h-3.5 w-3.5" /> Open / Print
                </button>
                <button
                  /*
                    The office copy says so in its filename.
                    Both copies used to save as `Estimate_<number>.pdf`, so
                    two files that differ by every withheld line were
                    indistinguishable in a downloads folder and in an email
                    attachment picker. Naming the risky one is free.
                  */
                  onClick={() => buildPdf(previewAsCustomer).save(
                    `Estimate_${(currentQuote as any)?.quoteNumber || 'draft'}${previewAsCustomer ? '' : '_INTERNAL'}.pdf`,
                  )}
                  className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-1.5 text-xs font-bold text-gray-300 hover:text-white"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
                <button
                  onClick={() => setEmailingQuote(true)}
                  className="flex items-center gap-2 rounded-lg bg-[#ea580c] px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600"
                >
                  <Mail className="h-3.5 w-3.5" /> Email
                </button>
                <button onClick={() => setPreviewDoc(false)} className="p-1.5 text-gray-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            {previewAsCustomer ? (
              <p className="bg-blue-500/10 px-5 py-2 text-xs text-blue-300">
                Exactly what the customer receives — your hidden lines and switched-off sections are not in it.
              </p>
            ) : (
              /*
                The office copy, said out loud.
                
                This is the view that shows withheld lines on purpose. Left
                unlabelled it reads as "hiding did not work", which is the
                one conclusion it must not invite.
              */
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-amber-500/10 px-5 py-2 text-xs text-amber-300">
                {withheldCount > 0 ? (
                  <>
                    <strong className="font-bold">Your office copy.</strong>
                    <span>
                      It deliberately still shows the {withheldCount} line{withheldCount === 1 ? '' : 's'} you
                      are withholding, each marked “(hidden from customer)”. They are
                      not on the customer's copy.
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewAsCustomer(true)}
                      className="rounded bg-amber-400/20 px-2 py-0.5 font-bold text-amber-200 underline-offset-2 hover:bg-amber-400/30 hover:underline"
                    >
                      Show me what they get
                    </button>
                  </>
                ) : (
                  <span>
                    <strong className="font-bold">Your office copy.</strong> Nothing is being withheld
                    on this quote, so the customer's copy is the same document.
                  </span>
                )}
              </div>
            )}
            {previewUrl ? (
              <iframe title="Quote PDF" src={previewUrl} className="h-full w-full flex-1 bg-white" />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
                Could not render the PDF.
              </div>
            )}
          </div>
        </div>
      )}

      {/*
        Send the quote as a PDF. The address defaults to the one on the job
        and is editable, because the person paying is often not the person
        whose email is on the record.
      */}
      {emailingQuote && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#111] p-6">
            <h3 className="mb-1 flex items-center gap-2 text-lg font-bold text-white">
              <Mail className="h-5 w-5 text-[#ea580c]" />
              Email this estimate
            </h3>
            <p className="mb-4 text-sm text-gray-400">
              Sends the customer copy as a PDF — the same thing they would see on the link,
              with whatever you have hidden left out.
            </p>
            <label className="mb-1 block text-xs font-semibold text-gray-400">Send to</label>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="name@example.com"
              className="mb-4 w-full rounded-lg border border-[#2A2A2A] bg-[#050505] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            />

            {/*
              The warmest moment to get somebody into the portal is while they
              are reading the price. Needs a phone number because the invite
              endpoint requires one — said here rather than failing on send.
            */}
            <label className="mb-4 flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#2A2A2A] bg-[#0B0B0B] p-3">
              <input
                type="checkbox"
                checked={inviteWithQuote}
                onChange={(e) => setInviteWithQuote(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-2 focus:ring-orange-500"
              />
              <span>
                <span className="block text-sm font-semibold text-white">
                  Also invite them to create an account
                </span>
                <span className="mt-0.5 block text-xs text-gray-400">
                  Sets up their portal so they can approve the estimate, follow the job and pay.
                  Sends a separate sign-in email.
                </span>
                {!String(workRequest.customerPhone || '').trim() && inviteWithQuote && (
                  <span className="mt-1 block text-xs font-semibold text-amber-400">
                    Needs a phone number on the job first — the estimate will still send.
                  </span>
                )}
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEmailingQuote(false)}
                disabled={emailSending}
                className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEmailQuote}
                disabled={emailSending}
                className="flex items-center gap-2 rounded-lg bg-[#ea580c] px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {emailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {emailSending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
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