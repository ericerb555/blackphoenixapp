/**
 * Customer Quote Approval Page
 * 
 * This is what a customer sees when they receive a quote and can approve it.
 * After approval, they'll see the contract and payment schedule.
 */

import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";
/**
 * Reused rather than rewritten: it returns null for a date it cannot parse,
 * which is exactly what a quote with no `validUntil` needs — this page used to
 * print "Invalid Date" at a customer.
 */
import { formatDate } from '../components/documents/quoteMath';
/**
 * Reading a stored quote lives next to `quoteMath` and not in here, because it
 * decides what a customer is told their job costs and the test runner strips
 * types from `.ts` only. See the note at the top of that file for what it
 * replaced — this page held a complete fictional kitchen renovation as its
 * initial state and merged the real quote over the top of it.
 */
import { readQuote, splitPayment, text, DEPOSIT_RATE, type Quote } from '../components/documents/quoteRead';
/**
 * The discount arrives with the quote, resolved by the server.
 *
 * This page used to load a membership record itself and work the percentage
 * out here, falling back to a `localStorage` value the customer owned — so a
 * paying subscriber often got nothing while anyone editing one browser value
 * took 15% off. The figure now comes down with the quote, computed from the
 * plan the payment actually granted plus any grants aimed at this customer,
 * and this page only displays it.
 */
interface ResolvedDiscount {
  percent: number;
  capped?: boolean;
  components?: Array<{ source: string; percent: number; why: string }>;
}
import {
  CheckCircle, X, DollarSign, Calendar, User, MapPin, Phone, Mail,
  FileText, Clock, Package, Users, Download, CreditCard, Shield,
  ArrowRight, Check, ChevronDown, ChevronRight, Building, AlertCircle,
  Sparkles, TrendingUp, Zap, Star, Award
} from 'lucide-react';
import { API_BASE_URL } from '../lib/apiConfig';

interface PaymentScheduleItem {
  id: string;
  type: 'deposit' | 'milestone' | 'progress' | 'completion';
  description: string;
  percentage: number;
  amount: number;
  dueDate?: string;
  milestone?: string;
  status: 'pending' | 'paid' | 'overdue';
}


export default function CustomerQuoteApproval() {
  const [loading, setLoading] = useState(true);
  const [tokenRecord, setTokenRecord] = useState<any>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);

  // Signature state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const [hasSigned, setHasSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [approved, setApproved] = useState(false);

  // Load quote from token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    // No token, no quote. This used to fall through to the fictional one, with
    // a working Approve button under it.
    if (!token) {
      setLoadError('This page needs the link from your quote email.');
      setLoading(false);
      return;
    }

    let live = true;
    // Deliberately the anon key. The share token IS the credential here — a
    // customer follows this link from an email to approve their quote, and
    // requiring them to be signed in would defeat the point of sending it.
    fetch(`${API_BASE_URL}/make-server-3eae23a6/quotes/by-token/${token}`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
    })
      // Read the body either way: a 404 carries the server's own sentence for
      // invalid, expired and revoked, and showing that is better than inventing
      // a message here. `r.ok ? r.json() : null` threw the sentence away.
      .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => null) }))
      .then(({ ok, data }) => {
        if (!live) return;

        if (!ok || !data?.quote) {
          setLoadError(text(data?.error) || 'This quote link is invalid or has expired.');
          setLoading(false);
          return;
        }

        setTokenRecord(data.quote);
        // Absent when the server could not resolve one, which means no
        // discount rather than a remembered one.
        setDiscount(data.discount || null);
        if (data.quote.status === 'approved') setAlreadySigned(true);
        setQuote(readQuote(data.quote));
        setLoading(false);
      })
      .catch(() => {
        if (!live) return;
        // A failure to reach the server is not an invalid link, and saying so
        // stops somebody binning a quote because their train went into a
        // tunnel.
        setLoadError('We could not load your quote just now. Check your connection and try again.');
        setLoading(false);
      });

    return () => { live = false; };
  }, []);

  // Canvas drawing helpers
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    setHasSigned(true);
  };
  const endDraw = () => setIsDrawing(false);
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleSign = async (decision: 'approved' | 'rejected' = 'approved') => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    /**
     * No token, no decision to record.
     *
     * What was here announced *"Quote approved! We'll be in touch shortly."*
     * and set the signed state, having sent nothing anywhere — a customer told
     * their quote was approved when no such thing had happened. It was labelled
     * "Demo mode" and reachable by anybody opening this page without a link.
     *
     * Unreachable now that a missing token renders the refusal instead, and
     * removed rather than left: a function that reports success for work it did
     * not do is the same failure as the fictional quote, in a different shape.
     */
    if (!token) {
      toast.error('This page needs the link from your quote email.');
      return;
    }

    if (decision === 'approved' && !hasSigned && !typedName.trim()) {
      toast.error('Please sign or type your name to approve');
      return;
    }

    setSigning(true);
    try {
      const signatureData = signatureMode === 'draw' && canvasRef.current
        ? canvasRef.current.toDataURL('image/png')
        : null;

      const res = await fetch(
        `${API_BASE_URL}/make-server-3eae23a6/quotes/by-token/${token}/sign`,
        {
          method: 'POST',
          headers: await authedHeadersOrAnon(publicAnonKey),
          body: JSON.stringify({
            signatureData,
            signerName: typedName || (tokenRecord?.clientName || 'Customer'),
            signedAt: new Date().toISOString(),
            decision,
          }),
        }
      );

      if (res.ok) {
        if (decision === 'approved') {
          setApproved(true);
          toast.success('Quote approved and signed! We\'ll contact you shortly to schedule.');
          /**
           * Telling the office happens on the server, in the route that just
           * recorded the approval.
           *
           * What was here called `sendApprovedQuoteNotification(quote, name)`
           * — a function that takes one argument and returns nothing — and
           * then `.catch()` on the nothing. That threw a TypeError every
           * time, which the outer catch turned into an error toast, so a
           * customer who had just successfully approved their quote was
           * immediately told it had failed.
           *
           * It would not have worked even without the crash: it wrote the
           * alert to `localStorage` on THIS device — the customer's — so the
           * office was never going to see it.
           */
        } else {
          toast.info('Quote rejected. We\'ll reach out to discuss alternatives.');
        }
      } else {
        toast.error('Failed to submit — please try again');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setSigning(false);
  };

  /**
   * The quote this link is for, or null until it has been read.
   *
   * WHAT WAS HERE, AND WHY IT MATTERED
   *
   * A complete fictional job, as the initial state: John Smith,
   * john.smith@email.com, a kitchen renovation at 123 Main St Springfield,
   * $10,200 of white shaker cabinets, Kashmir White granite, four labour roles,
   * a seven-step kitchen process and a $27,173 total.
   *
   * The real quote was then merged OVER the top of it, field by field, with
   * `|| prev` on every line — so any field the record did not carry fell back
   * to the fiction. A quote with no `materials` array displayed granite
   * countertops. And `address`, `processSteps`, `taxRate`, `validUntil` and
   * `generatedAt` were not in the merge at all, so even a perfectly good quote
   * showed Springfield, seven kitchen steps and an April 2026 expiry.
   *
   * `loading` was set but never read, and the fetch discarded failures
   * (`r.ok ? r.json() : null`). So an invalid, expired or revoked link — and a
   * network error, and no token at all — left the whole invention on screen,
   * with an Approve button under it and nothing anywhere to say it was not this
   * customer's quote.
   *
   * It is null now. The page renders nothing until the token resolves, a
   * refusal when it does not, and a field the record does not carry is absent
   * rather than inherited.
   */
  const [quote, setQuote] = useState<Quote | null>(null);
  /**
   * Why the quote could not be shown.
   *
   * The server answers invalid, expired and revoked with one sentence on
   * purpose — *"'Expired' would confirm the link was once real, which is
   * information a stranger guessing should not be given"* — so this displays
   * what it said rather than deciding anything itself.
   */
  const [loadError, setLoadError] = useState<string | null>(null);

  // Sent with the quote by the server. Nothing here decides it.
  const [discount, setDiscount] = useState<ResolvedDiscount | null>(null);
  const discountPct = Number(discount?.percent || 0);
  const jobSubtotal = (quote?.materialsSubtotal || 0) + (quote?.laborSubtotal || 0);
  const discountAmount = Math.round(jobSubtotal * (discountPct / 100));
  const discountedTotal = Math.max(0, (quote?.totalCost || 0) - discountAmount);

  /**
   * What the customer is asked to pay, and when.
   *
   * WHAT WAS HERE
   *
   * Four hardcoded installments — $8,152, $6,793, $6,793 and $5,435 — being
   * 30/25/25/20 of the fictional $27,173 above, with milestones describing
   * somebody else's job: *"After demolition and rough-in complete"*,
   * *"Cabinets & Countertops Installed"*. They were shown under a heading
   * reading "Your project cost of $X will be paid in 4 installments", in the
   * one section of this page that defaults to expanded.
   *
   * Nothing backed them. There is no payment schedule on a quote record and no
   * milestone policy anywhere in the codebase — `grep` finds `paymentSchedule`
   * in five browser files and zero server ones.
   *
   * WHAT IS HERE INSTEAD
   *
   * The two figures that are real: the deposit this page's own checkout button
   * charges, and the balance. Both computed from the total the customer is
   * being shown, which is the discounted one — the old code took 30% of
   * `quote.totalCost` while the page crossed that number out and displayed
   * `discountedTotal` as the project cost, so a subscriber was asked for a
   * deposit on a price we had just told them they were not paying.
   *
   * No invented triggers and no invented dates. When a quote record carries a
   * real schedule, this is where it goes.
   */
  const { deposit: depositAmount, balance: balanceAmount } = splitPayment(discountedTotal);

  // No effect here any more. Asking the server a second question about who
  // this customer is would be a second chance to get a different answer;
  // the discount comes down with the quote it applies to.

  const [showContract, setShowContract] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    materials: false,
    labor: false,
    process: false,
    payment: true
  });

  const [contractType, setContractType] = useState<'standard' | 'soroban-smart-contract'>('standard');

  /**
   * The two stages that are real, derived from this quote's own total.
   *
   * See the note on `depositAmount` for what was here. `dueDate` and
   * `milestone` are deliberately left off: a date nobody has agreed and a
   * trigger nobody wrote down are the two fields that made the old schedule
   * read as a commitment.
   */
  const paymentSchedule: PaymentScheduleItem[] = [
    {
      id: 'deposit',
      type: 'deposit',
      description: 'Deposit — secures your materials and your place in the schedule',
      percentage: Math.round(DEPOSIT_RATE * 100),
      amount: depositAmount,
      status: 'pending',
    },
    {
      id: 'balance',
      type: 'completion',
      description: 'Balance — due as the work completes',
      percentage: 100 - Math.round(DEPOSIT_RATE * 100),
      amount: balanceAmount,
      status: 'pending',
    },
  ];

  const handleApprove = () => {
    if (!quote) return;
    setQuote({ ...quote, approvalStatus: 'approved' });
    toast.success('Quote Approved!', {
      description: 'Your contract is being generated...'
    });
    
    /**
     * Nothing is announced here, because nothing has been approved yet.
     *
     * This is the step that reveals the contract; the approval is recorded
     * further down, when the customer signs. What was here wrote an "approved"
     * alert into this browser's localStorage — so it told the office nothing,
     * and it said it at a moment when the customer had not yet agreed to
     * anything. The office is told by the server when the signature lands.
     */
    
    // Simulate contract generation
    setTimeout(() => {
      setShowContract(true);
      toast.success('Contract Generated!', {
        description: 'Review your contract and payment schedule below'
      });
    }, 2000);
  };

  const handleReject = () => {
    if (!quote) return;
    toast.error('Quote rejected. We\'ll contact you to discuss revisions.');
    setQuote({ ...quote, approvalStatus: 'rejected' });
  };

  const toggleSection = (section: string) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };

  /**
   * Nothing is rendered until the link has been resolved.
   *
   * These three returns are what makes the removal of the fictional quote
   * complete: without them an unresolved page renders its empty state, which is
   * a different wrong answer rather than no answer.
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-[#2A2A2A] border-t-[#ea580c] animate-spin" />
          <p className="text-gray-400">Loading your quote…</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">We can't show this quote</h1>
          <p className="text-gray-400 mb-6">{loadError || 'This quote link is invalid or has expired.'}</p>
          <p className="text-sm text-gray-500">
            Quote links expire after 30 days. If yours has run out, reply to the email it came in
            and we'll send a fresh one.
          </p>
        </div>
      </div>
    );
  }

  if (quote.approvalStatus === 'pending') {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#ea580c] to-orange-700 border-b border-orange-600">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Quote for Review</h1>
                {quote.quoteNumber && (
                  <p className="text-orange-100">Quote #{quote.quoteNumber}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6 text-white/90 text-sm">
              {/*
                `formatDate` returns null for a date it cannot parse, which is
                what every quote with no `validUntil` produced here — the old
                line rendered "Valid until Invalid Date", and before that it
                rendered the mock's April 2026 on every real quote.
              */}
              {formatDate(quote.validUntil) && (
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Valid until {formatDate(quote.validUntil)}
                </span>
              )}
              <span className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Professional Contracting Services
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Project Info */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">
              {quote.projectTitle || 'Your project'}
            </h2>
            {quote.projectDescription && (
              <p className="text-gray-400 mb-6">{quote.projectDescription}</p>
            )}

            {/* Each block appears only where the record has something to put in
                it. An empty "Project Location" heading over a blank line is how
                the old merge advertised that it had nothing. */}
            <div className="grid grid-cols-2 gap-4">
              {(quote.customerName || quote.customerEmail || quote.customerPhone) && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-[#ea580c] mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-500">Customer</div>
                    {quote.customerName && (
                      <div className="text-white font-medium">{quote.customerName}</div>
                    )}
                    {quote.customerEmail && (
                      <div className="text-gray-400 text-sm">{quote.customerEmail}</div>
                    )}
                    {quote.customerPhone && (
                      <div className="text-gray-400 text-sm">{quote.customerPhone}</div>
                    )}
                  </div>
                </div>
              )}
              {quote.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#ea580c] mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-500">Project Location</div>
                    <div className="text-white font-medium">{quote.address}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/*
            A section with no rows is not shown.

            It used to be unconditional, which was invisible while the fictional
            quote guaranteed four materials, four labour roles and seven steps.
            On a real quote it would have rendered "Materials — 0 items" above
            an empty box, and a customer reading that reasonably concludes the
            job includes no materials.
          */}
          {quote.materials.length > 0 && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl mb-6 overflow-hidden">
            <button
              onClick={() => toggleSection('materials')}
              className="w-full flex items-center justify-between p-6 hover:bg-[#2A2A2A]/30 transition"
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-[#ea580c]" />
                <h3 className="text-xl font-bold text-white">
                  {quote.linesAreMaterials ? 'Materials' : 'Items'}
                </h3>
                <span className="px-3 py-1 bg-[#ea580c]/20 text-[#ea580c] rounded-full text-sm font-semibold">
                  {quote.materials.length} {quote.materials.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              {expandedSections.materials ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
            </button>
            
            {expandedSections.materials && (
              <div className="border-t border-[#2A2A2A] p-6">
                <div className="space-y-3">
                  {quote.materials.map((item) => (
                    <div key={item.id} className="flex items-start justify-between p-4 bg-[#0A0A0A] rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold mb-1">{item.name}</h4>
                        {item.description && (
                          <p className="text-gray-400 text-sm mb-2">{item.description}</p>
                        )}
                        {/* "Qty: 0  @ $0.00/" is what an unpriced or
                            quantity-less line used to render. Each part appears
                            only where there is a figure behind it. */}
                        <div className="flex items-center gap-4 text-sm">
                          {item.quantity > 0 && (
                            <span className="text-gray-500">Qty: {item.quantity} {item.unit}</span>
                          )}
                          {item.unitCost > 0 && (
                            <span className="text-gray-500">
                              @ ${item.unitCost.toFixed(2)}{item.unit ? `/${item.unit}` : ''}
                            </span>
                          )}
                          {item.category && (
                            <span className="px-2 py-1 bg-[#2A2A2A] text-gray-400 rounded text-sm">{item.category}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-white">${item.totalCost.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[#2A2A2A] flex justify-between items-center">
                  <span className="text-gray-400 font-semibold">
                    {quote.linesAreMaterials ? 'Materials Subtotal' : 'Subtotal'}
                  </span>
                  <span className="text-2xl font-bold text-white">${quote.materialsSubtotal.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Labor */}
          {quote.labor.length > 0 && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl mb-6 overflow-hidden">
            <button
              onClick={() => toggleSection('labor')}
              className="w-full flex items-center justify-between p-6 hover:bg-[#2A2A2A]/30 transition"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-[#ea580c]" />
                <h3 className="text-xl font-bold text-white">Labor</h3>
                <span className="px-3 py-1 bg-[#ea580c]/20 text-[#ea580c] rounded-full text-sm font-semibold">
                  {quote.labor.length} {quote.labor.length === 1 ? 'role' : 'roles'}
                </span>
              </div>
              {expandedSections.labor ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
            </button>
            
            {expandedSections.labor && (
              <div className="border-t border-[#2A2A2A] p-6">
                <div className="space-y-3">
                  {quote.labor.map((item) => (
                    <div key={item.id} className="flex items-start justify-between p-4 bg-[#0A0A0A] rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold mb-1">{item.role}</h4>
                        {item.description && (
                          <p className="text-gray-400 text-sm mb-2">{item.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {item.hours > 0 && (
                            <span>{item.hours} {item.hours === 1 ? 'hour' : 'hours'}</span>
                          )}
                          {item.hourlyRate > 0 && <span>@ ${item.hourlyRate}/hour</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-white">${item.totalCost.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[#2A2A2A] flex justify-between items-center">
                  <span className="text-gray-400 font-semibold">Labor Subtotal</span>
                  <span className="text-2xl font-bold text-white">${quote.laborSubtotal.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Process Steps */}
          {quote.processSteps.length > 0 && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl mb-6 overflow-hidden">
            <button
              onClick={() => toggleSection('process')}
              className="w-full flex items-center justify-between p-6 hover:bg-[#2A2A2A]/30 transition"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#ea580c]" />
                <h3 className="text-xl font-bold text-white">Project Process</h3>
                <span className="px-3 py-1 bg-[#ea580c]/20 text-[#ea580c] rounded-full text-sm font-semibold">
                  {quote.processSteps.length} {quote.processSteps.length === 1 ? 'step' : 'steps'}
                </span>
              </div>
              {expandedSections.process ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
            </button>
            
            {expandedSections.process && (
              <div className="border-t border-[#2A2A2A] p-6">
                <div className="space-y-4">
                  {quote.processSteps.map((step, index) => (
                    <div key={step.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center text-white font-bold">
                          {step.stepNumber}
                        </div>
                        {index < quote.processSteps.length - 1 && (
                          <div className="w-0.5 h-full bg-gradient-to-b from-[#ea580c] to-transparent mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <h4 className="text-white font-semibold mb-1">{step.title}</h4>
                        {step.description && (
                          <p className="text-gray-400 text-sm mb-2">{step.description}</p>
                        )}
                        {step.estimatedDuration && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>{step.estimatedDuration}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          )}

          {/* Total Cost */}
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0d0d0d] border border-[#ea580c]/30 rounded-2xl p-6 mb-6">
            <div className="space-y-3">
              {/* Each component line appears only where there is one. A quote
                  held as a single `items` list has no labour subtotal, and
                  "Labor $0" on it reads as a claim that the work is free. */}
              {quote.materialsSubtotal > 0 && (
                <div className="flex justify-between items-center text-gray-400">
                  <span>{quote.linesAreMaterials ? 'Materials' : 'Subtotal'}</span>
                  <span className="font-semibold">${quote.materialsSubtotal.toLocaleString()}</span>
                </div>
              )}
              {quote.laborSubtotal > 0 && (
                <div className="flex justify-between items-center text-gray-400">
                  <span>Labor</span>
                  <span className="font-semibold">${quote.laborSubtotal.toLocaleString()}</span>
                </div>
              )}
              {/* Labelled "Tax", with no rate. See the note on `taxAmount`. */}
              {quote.taxAmount > 0 && (
                <div className="flex justify-between items-center text-gray-400">
                  <span>Tax</span>
                  <span className="font-semibold">${quote.taxAmount.toLocaleString()}</span>
                </div>
              )}
              {discountPct > 0 && (
                <div className="flex justify-between items-center text-green-400">
                  <span className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    {/* The server says what each part of this is for. Shown as
                        given — this page has no plan catalogue to look names up
                        in, and inventing one is how the two came to disagree. */}
                    {discount?.components?.map(c => c.why).filter(Boolean).join(' + ') || 'Discount'}
                    {' '}({discountPct}% off)
                  </span>
                  <span className="font-semibold">−${discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="pt-3 border-t border-[#2A2A2A] flex justify-between items-center">
                <span className="text-2xl font-bold text-white">Total Project Cost</span>
                <div className="text-right">
                  {discountPct > 0 && (
                    <div className="text-lg text-gray-500 line-through">${quote.totalCost.toLocaleString()}</div>
                  )}
                  <span className="text-4xl font-bold text-[#ea580c]">${discountedTotal.toLocaleString()}</span>
                </div>
              </div>
              {discountPct > 0 && (
                <div className="text-sm text-green-400/80 text-right">
                  You saved ${discountAmount.toLocaleString()} with your subscription
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleReject}
              className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-[#1A1A1A] border border-red-500/30 hover:bg-red-500/10 rounded-xl text-red-400 font-bold transition-all"
            >
              <X className="w-5 h-5" />
              Request Changes
            </button>
            <button
              onClick={handleApprove}
              className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#ea580c] to-orange-700 hover:shadow-xl hover:shadow-[#ea580c]/50 rounded-xl text-white font-bold transition-all"
            >
              <CheckCircle className="w-5 h-5" />
              Approve Quote & Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Contract View (After Approval)
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Success Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 border-b border-green-500">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Quote Approved!</h1>
              <p className="text-green-100">Your contract is ready for signature</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Contract Type Selection */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#ea580c]" />
            Select Contract Type
          </h2>
          <p className="text-gray-400 mb-6">Choose how you'd like to execute this contract</p>

          <div className="grid grid-cols-2 gap-4">
            {/* Standard Contract */}
            <button
              onClick={() => setContractType('standard')}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                contractType === 'standard'
                  ? 'border-[#ea580c] bg-[#ea580c]/10'
                  : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#ea580c]/50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <FileText className={`w-8 h-8 ${contractType === 'standard' ? 'text-[#ea580c]' : 'text-gray-400'}`} />
                {contractType === 'standard' && (
                  <div className="w-6 h-6 rounded-full bg-[#ea580c] flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Standard Contract</h3>
              <p className="text-gray-400 text-sm mb-4">Traditional digital contract with e-signature</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  PDF download available
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  Digital signature
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  Email notifications
                </li>
              </ul>
            </button>

            {/* Smart Contract */}
            <button
              onClick={() => setContractType('soroban-smart-contract')}
              className={`p-6 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                contractType === 'soroban-smart-contract'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-purple-500/50'
              }`}
            >
              <div className="absolute top-2 right-2">
                <span className="px-2 py-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  RECOMMENDED
                </span>
              </div>
              <div className="flex items-start justify-between mb-3">
                <Zap className={`w-8 h-8 ${contractType === 'soroban-smart-contract' ? 'text-purple-400' : 'text-gray-400'}`} />
                {contractType === 'soroban-smart-contract' && (
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Soroban Smart Contract</h3>
              <p className="text-gray-400 text-sm mb-4">Blockchain-powered contract with automated payments</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-400" />
                  Automated milestone payments
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-400" />
                  Immutable record on blockchain
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-400" />
                  Enhanced security & transparency
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-400" />
                  Instant payment verification
                </li>
              </ul>
            </button>
          </div>
        </div>

        {/* Payment Schedule */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl mb-6 overflow-hidden">
          <div className="p-6 border-b border-[#2A2A2A]">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-[#ea580c]" />
              Payment Schedule
            </h2>
            {/* The DISCOUNTED total, which is the figure shown as the project
                cost above. This line quoted `quote.totalCost` — the one the
                page crosses out for a subscriber — and promised "4
                installments" regardless of how many were listed. */}
            <p className="text-gray-400">
              Your project cost of ${discountedTotal.toLocaleString()}, in{' '}
              {paymentSchedule.length === 2 ? 'two stages' : `${paymentSchedule.length} stages`}
            </p>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {paymentSchedule.map((payment, index) => (
                <div key={payment.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                      payment.type === 'deposit' ? 'bg-gradient-to-br from-blue-600 to-blue-700' :
                      payment.type === 'milestone' ? 'bg-gradient-to-br from-purple-600 to-purple-700' :
                      'bg-gradient-to-br from-green-600 to-green-700'
                    }`}>
                      {index + 1}
                    </div>
                    {index < paymentSchedule.length - 1 && (
                      <div className="w-0.5 h-full bg-gradient-to-b from-[#ea580c] to-transparent mt-2"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="bg-[#0A0A0A] rounded-xl p-5 border border-[#2A2A2A]">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-white font-bold text-lg">{payment.description}</h3>
                            <span className={`px-2 py-1 rounded-full text-sm font-bold ${
                              payment.type === 'deposit' ? 'bg-blue-500/20 text-blue-400' :
                              payment.type === 'milestone' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {payment.type.toUpperCase()}
                            </span>
                          </div>
                          {payment.milestone && (
                            <p className="text-gray-400 text-sm mb-2">
                              <AlertCircle className="w-4 h-4 inline mr-1" />
                              Triggered by: {payment.milestone}
                            </p>
                          )}
                          {payment.dueDate && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Calendar className="w-4 h-4" />
                              Due: {new Date(payment.dueDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500 mb-1">{payment.percentage}% of total</div>
                          <div className="text-2xl font-bold text-[#ea580c]">${payment.amount.toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-[#2A2A2A]">
                        <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                          payment.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                          payment.status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {payment.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Summary */}
            <div className="mt-6 p-5 bg-gradient-to-br from-[#ea580c]/10 to-orange-700/10 border border-[#ea580c]/30 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 font-semibold">Total Payment Schedule</span>
                <span className="text-3xl font-bold text-[#ea580c]">
                  ${paymentSchedule.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                </span>
              </div>
              {/*
                Built from the schedule rather than from three fixed headings.

                The old grid had a "Milestones" column summing every entry of
                that type — zero of them now — and rendered `undefined` into
                any column whose type was absent, because
                `.find(...)?.amount.toLocaleString()` yields undefined rather
                than a dash. "$undefined" is worse than a column that is not
                there.
              */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                {paymentSchedule.map((payment) => (
                  <div key={payment.id}>
                    <div className="text-gray-500 mb-1">
                      {payment.type === 'deposit' ? 'Deposit' : 'Balance'}
                    </div>
                    <div className="text-white font-bold">${payment.amount.toLocaleString()}</div>
                  </div>
                ))}
                <div>
                  <div className="text-gray-500 mb-1">Payments</div>
                  <div className="text-white font-bold">{paymentSchedule.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Terms */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#ea580c]" />
            Contract Terms
          </h2>
          <div className="bg-[#0A0A0A] rounded-xl p-5 border border-[#2A2A2A] text-gray-400 leading-relaxed space-y-4 max-h-96 overflow-y-auto">
            <p><strong className="text-white">1. PROJECT SCOPE:</strong> The Contractor agrees to perform the work described in the approved quote including all materials and labor as specified.</p>
            <p><strong className="text-white">2. PAYMENT TERMS:</strong> Payment shall be made according to the payment schedule outlined above. Each milestone payment is contingent upon completion and approval of the specified work.</p>
            <p><strong className="text-white">3. PROJECT TIMELINE:</strong> Work shall commence within 5 business days of deposit receipt and shall be completed within the estimated timeframe barring unforeseen circumstances.</p>
            <p><strong className="text-white">4. CHANGE ORDERS:</strong> Any changes to the scope of work must be approved in writing and may affect the total cost and timeline.</p>
            <p><strong className="text-white">5. WARRANTIES:</strong> All work is guaranteed for one year from the date of completion. Materials carry manufacturer warranties.</p>
            <p><strong className="text-white">6. PERMITS & INSPECTIONS:</strong> Contractor will obtain all necessary permits. Work will be performed to code and subject to inspection.</p>
            <p><strong className="text-white">7. INSURANCE:</strong> Contractor maintains general liability and workers' compensation insurance.</p>
            <p><strong className="text-white">8. CANCELLATION:</strong> Either party may cancel with 48 hours written notice. Deposit is non-refundable after materials are ordered.</p>

            {/*
              Clauses 9 and 10 are the ones that decide who pays when a job
              turns out to be different from the job that was quoted.

              WHY THEY ARE WRITTEN THIS WAY

              "Any extra cost is yours" on its own is the weak version. A
              concealed-conditions clause is worth having when it is specific
              about what counts, and when it obliges us to stop, show the
              customer what we found, price it, and get approval before
              spending their money. That sequence is what makes it fair, what
              makes it hold up, and what stops the argument happening at the
              end of the job instead of at the moment of discovery.

              The numbers — 30 days, 5%, $250 — are commercial choices, not
              legal requirements, and are meant to be adjusted.
            */}
            <p><strong className="text-white">9. CONCEALED AND UNFORESEEN CONDITIONS:</strong> This quote is based on the
              conditions that were visible and accessible when it was prepared. Renovation and repair work regularly
              uncovers conditions that could not be seen beforehand — rot, water or insect damage behind finishes;
              failed, undersized or missing structure; wiring, plumbing or venting that is unsafe or not to code;
              asbestos, lead or mould; unmarked or mislocated utilities; and existing work that must be brought up to
              current code before an inspector will pass ours.{' '}
              <strong className="text-white">If we find such a condition we will stop work in that area, tell you in
              writing what we found and what it will cost to put right, and wait for your written approval before
              continuing.</strong> Work elsewhere carries on where it is safe to do so. The cost of correcting a
              concealed condition is not included in this quote and is the responsibility of the owner. Black Phoenix
              does not carry the cost of conditions that could not have been seen at the time of quoting.</p>

            <p><strong className="text-white">10. MATERIAL PRICES:</strong> Quoted material prices are held for 30 days
              from the date of this quote. Beyond that, and where a supplier raises a price after the quote is signed,
              the documented difference is passed through at cost — we will show you the supplier's invoice or
              quotation, and we add no markup to an increase. Where an increase on a single item is more than 5% or
              $250, whichever is greater, we will tell you before ordering, and you may approve it, choose an
              alternative, or remove the item from the scope.</p>
          </div>
        </div>

        {/*
          Said in plain words, immediately above the signature.

          Clauses 9 and 10 sit inside a scrolling box with eight others, and the
          one point a customer most needs to have actually understood is the one
          about who pays when the wall comes off. An unread clause is a disputed
          clause — the argument happens at the end of the job, when somebody is
          holding an invoice they were not expecting. Saying it here, briefly and
          without legal furniture, is what stops that.

          It repeats rather than replaces the terms above; nothing here is the
          operative text.
        */}
        {!approved && !alreadySigned && (
          <div className="bg-[#1A1A1A] border border-amber-500/30 rounded-2xl p-6 mb-6">
            <h3 className="flex items-center gap-2 text-lg font-bold text-white">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              Before you sign — what could change this price
            </h3>
            <p className="mt-2 text-gray-300">
              This price covers what we could see. On a renovation, taking a wall or a floor
              apart sometimes reveals things nobody could have known were there — rot behind a
              finish, wiring that is not to code, structure that has failed.
            </p>
            <p className="mt-2 text-gray-300">
              <strong className="text-white">If that happens, we stop and show you</strong> what
              we found and what it costs before we spend a penny of your money on it. You decide
              whether to go ahead. What we will not do is absorb the cost of a problem that was
              hidden when we quoted — and we will not quietly add it to your bill either.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Material prices are held for 30 days. After that, any documented supplier increase is
              passed on at cost with no markup, and anything over 5% or $250 comes to you first.
              Clauses 9 and 10 above are the full terms.
            </p>
          </div>
        )}

        {/* ── E-SIGNATURE SECTION ── */}
        {approved || alreadySigned ? (
          <div className="bg-green-500/10 border-2 border-green-500/40 rounded-2xl p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Quote Approved & Signed!</h3>
            <p className="text-gray-400 mb-6">Thank you! Secure your project by paying your deposit now.</p>
          <button
            onClick={async () => {
              /**
               * The same `depositAmount` the schedule above shows.
               *
               * This read `quote.totalCost * 0.30` — the total the page crosses
               * out when a subscription discount applies — so a subscriber was
               * charged a deposit on a price we had just told them they were
               * not paying, and the figure on the button disagreed with the
               * figure in the schedule.
               */
              const res = await fetch(
                `${API_BASE_URL}/make-server-3eae23a6/payments/create-checkout`,
                {
                  method: 'POST',
                  headers: await authedHeadersOrAnon(publicAnonKey),
                  body: JSON.stringify({
                    amount: depositAmount,
                    description: `${Math.round(DEPOSIT_RATE * 100)}% Deposit — ${quote.projectTitle || 'your project'}`,
                    clientName: quote.customerName,
                    clientEmail: quote.customerEmail,
                    clientPhone: quote.customerPhone,
                    workRequestId: tokenRecord?.workRequestId || quote.id,
                  }),
                }
              );
              const data = await res.json();
              if (data.url) window.location.href = data.url;
              else toast.error(data.error || 'Payment setup in progress — we\'ll send you a payment link shortly');
            }}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 text-white font-bold text-lg rounded-xl transition shadow-xl shadow-green-500/30"
          >
            <CreditCard className="w-6 h-6" />
            Pay {Math.round(DEPOSIT_RATE * 100)}% Deposit — ${depositAmount.toLocaleString()}
          </button>
          </div>
        ) : (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 space-y-5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-400" />
              Sign to Approve This Quote
            </h2>

            {/* Mode selector */}
            <div className="flex gap-2">
              <button onClick={() => setSignatureMode('draw')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${signatureMode === 'draw' ? 'bg-orange-600 text-white' : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>✍️ Draw Signature</button>
              <button onClick={() => setSignatureMode('type')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${signatureMode === 'type' ? 'bg-orange-600 text-white' : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>⌨️ Type Name</button>
            </div>

            {signatureMode === 'draw' ? (
              <div>
                <p className="text-xs text-gray-500 mb-2">Draw your signature below:</p>
                <div className="relative border-2 border-dashed border-[#3A3A3A] rounded-xl overflow-hidden bg-[#0A0A0A]">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={160}
                    className="w-full touch-none cursor-crosshair"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                  />
                  {!hasSigned && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-gray-600 text-sm">Sign here</p>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 border-t border-[#2A2A2A]" />
                </div>
                {hasSigned && (
                  <button onClick={clearSignature} className="mt-2 text-xs text-gray-500 hover:text-white transition">Clear signature</button>
                )}
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 mb-2">Type your full legal name to sign:</p>
                <input
                  value={typedName}
                  onChange={e => setTypedName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-xl italic focus:border-orange-500 focus:outline-none"
                  style={{ fontFamily: 'cursive' }}
                />
              </div>
            )}

            <p className="text-xs text-gray-500">By signing, you agree to the contract terms above and authorize Black Phoenix Company to begin scheduling your project.</p>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleSign('rejected')}
                disabled={signing}
                className="px-5 py-3 bg-[#0A0A0A] border border-red-500/30 hover:border-red-500/60 text-red-400 rounded-xl text-sm font-semibold transition disabled:opacity-50"
              >
                Decline Quote
              </button>
              <button
                onClick={() => handleSign('approved')}
                disabled={signing || (signatureMode === 'draw' && !hasSigned && !typedName) || (signatureMode === 'type' && !typedName.trim())}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 text-white font-bold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
              >
                {signing ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</> : <><CheckCircle className="w-5 h-5" /> Approve & Sign Quote <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* Info Banner */}
        {!approved && !alreadySigned && (
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-200">
              <strong className="text-blue-100">After approving:</strong> You'll receive a confirmation email and we'll call you within 24 hours to schedule your start date.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}