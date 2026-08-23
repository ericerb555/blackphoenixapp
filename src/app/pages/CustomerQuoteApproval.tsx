/**
 * Customer Quote Approval Page
 * 
 * This is what a customer sees when they receive a quote and can approve it.
 * After approval, they'll see the contract and payment schedule.
 */

import { toast } from 'sonner@2.0.3';
import { sendApprovedQuoteNotification } from '../utils/adminAlertHelper';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";
import {
  loadCustomerMembership,
  contractDiscountForMembership,
  planTierLabel,
  isLandlordPlanId,
  type CustomerMembership,
} from '../lib/subscriptionDiscount';
import {
  CheckCircle, X, DollarSign, Calendar, User, MapPin, Phone, Mail,
  FileText, Clock, Package, Users, Download, CreditCard, Shield,
  ArrowRight, Check, ChevronDown, ChevronRight, Building, AlertCircle,
  Sparkles, TrendingUp, Zap, Star, Award
} from 'lucide-react';

interface MaterialItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  category: string;
}

interface LaborItem {
  id: string;
  role: string;
  description: string;
  hours: number;
  hourlyRate: number;
  totalCost: number;
}

interface ProcessStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  estimatedDuration: string;
}

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

interface Quote {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectTitle: string;
  projectDescription: string;
  address: string;
  materials: MaterialItem[];
  labor: LaborItem[];
  processSteps: ProcessStep[];
  materialsSubtotal: number;
  laborSubtotal: number;
  taxRate: number;
  taxAmount: number;
  totalCost: number;
  generatedAt: string;
  validUntil: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
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
    if (token) {
      // Deliberately the anon key. The share token IS the credential here — a
      // customer follows this link from an email to approve their quote, and
      // requiring them to be signed in would defeat the point of sending it.
      fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/quotes/by-token/${token}`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.quote) {
            setTokenRecord(data.quote);
            if (data.quote.status === 'approved') setAlreadySigned(true);
            // Merge real quote data if available
            if (data.quote.quoteData) {
              const qd = data.quote.quoteData;
              setQuote(prev => ({
                ...prev,
                id: qd.id || prev.id,
                quoteNumber: qd.quoteNumber || prev.quoteNumber,
                customerName: data.quote.clientName || prev.customerName,
                customerEmail: data.quote.clientEmail || prev.customerEmail,
                customerPhone: data.quote.clientPhone || prev.customerPhone,
                projectTitle: qd.title || qd.serviceType || prev.projectTitle,
                projectDescription: qd.description || prev.projectDescription,
                materials: qd.materials || qd.materialItems || prev.materials,
                labor: qd.labor || qd.laborItems || prev.labor,
                materialsSubtotal: qd.materialsSubtotal || qd.subtotals?.materials || prev.materialsSubtotal,
                laborSubtotal: qd.laborSubtotal || qd.subtotals?.labor || prev.laborSubtotal,
                taxAmount: qd.taxAmount || qd.subtotals?.tax || prev.taxAmount,
                totalCost: qd.totalCost || qd.total || prev.totalCost,
              }));
            }
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
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
    if (!token) {
      // Demo mode — just show success
      toast.success(decision === 'approved' ? 'Quote approved! We\'ll be in touch shortly.' : 'Quote rejected. We\'ll reach out to discuss.');
      if (decision === 'approved') setApproved(true);
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
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/quotes/by-token/${token}/sign`,
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
          sendApprovedQuoteNotification(quote, quote.customerName).catch(() => {});
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

  const [quote, setQuote] = useState<Quote>({
    id: 'Q-2026-001',
    quoteNumber: 'QT-2026-001',
    customerName: 'John Smith',
    customerEmail: 'john.smith@email.com',
    customerPhone: '(555) 123-4567',
    projectTitle: 'Kitchen Renovation',
    projectDescription: 'Complete kitchen remodel including cabinets, countertops, and appliances',
    address: '123 Main St, Springfield, CA 90001',
    materials: [
      { id: 'm1', name: 'Kitchen Cabinets - White Shaker Style', description: 'Custom fit wall and base cabinets', quantity: 12, unit: 'units', unitCost: 850, totalCost: 10200, category: 'Cabinetry' },
      { id: 'm2', name: 'Granite Countertops - Kashmir White', description: '3cm thick granite with polished edge', quantity: 45, unit: 'sq ft', unitCost: 75, totalCost: 3375, category: 'Countertops' },
      { id: 'm3', name: 'Stainless Steel Appliances Package', description: 'Refrigerator, range, dishwasher, microwave', quantity: 1, unit: 'set', unitCost: 4500, totalCost: 4500, category: 'Appliances' },
      { id: 'm4', name: 'Under-Cabinet LED Lighting', description: 'Energy efficient LED strip lighting', quantity: 16, unit: 'ft', unitCost: 25, totalCost: 400, category: 'Electrical' }
    ],
    labor: [
      { id: 'l1', role: 'General Contractor', description: 'Project oversight and coordination', hours: 40, hourlyRate: 75, totalCost: 3000 },
      { id: 'l2', role: 'Cabinet Installer', description: 'Remove old cabinets, install new cabinets', hours: 32, hourlyRate: 65, totalCost: 2080 },
      { id: 'l3', role: 'Countertop Installer', description: 'Template, fabricate, and install granite', hours: 16, hourlyRate: 70, totalCost: 1120 },
      { id: 'l4', role: 'Licensed Electrician', description: 'Electrical work and lighting installation', hours: 12, hourlyRate: 85, totalCost: 1020 }
    ],
    processSteps: [
      { id: 's1', stepNumber: 1, title: 'Demolition & Prep', description: 'Remove existing cabinets, countertops, and appliances. Protect flooring and adjacent areas.', estimatedDuration: '1-2 days' },
      { id: 's2', stepNumber: 2, title: 'Electrical & Plumbing Rough-In', description: 'Update electrical outlets and lighting circuits. Relocate plumbing as needed.', estimatedDuration: '1 day' },
      { id: 's3', stepNumber: 3, title: 'Cabinet Installation', description: 'Install all wall and base cabinets, ensuring level and plumb.', estimatedDuration: '2-3 days' },
      { id: 's4', stepNumber: 4, title: 'Countertop Template & Fabrication', description: 'Create precise template, fabricate granite countertops off-site.', estimatedDuration: '3-5 days' },
      { id: 's5', stepNumber: 5, title: 'Countertop & Backsplash Installation', description: 'Install granite countertops and tile backsplash.', estimatedDuration: '2 days' },
      { id: 's6', stepNumber: 6, title: 'Appliance & Fixture Installation', description: 'Install all appliances, sink, faucet, and lighting.', estimatedDuration: '1 day' },
      { id: 's7', stepNumber: 7, title: 'Final Inspection & Cleanup', description: 'Final walkthrough, punch list items, thorough cleanup.', estimatedDuration: '1 day' }
    ],
    materialsSubtotal: 18475,
    laborSubtotal: 7220,
    taxRate: 0.08,
    taxAmount: 1478,
    totalCost: 27173,
    generatedAt: '2026-03-14T10:00:00Z',
    validUntil: '2026-04-14T23:59:59Z',
    approvalStatus: 'pending'
  });

  // Subscription / maintenance-plan loyalty discount on this contract job
  const [membership, setMembership] = useState<CustomerMembership | null>(null);
  const discountPct = contractDiscountForMembership(membership);
  const jobSubtotal = quote.materialsSubtotal + quote.laborSubtotal;
  const discountAmount = Math.round(jobSubtotal * (discountPct / 100));
  const discountedTotal = Math.max(0, quote.totalCost - discountAmount);

  // Resolve the customer's membership by email whenever it changes.
  useEffect(() => {
    let cancelled = false;
    const email = quote.customerEmail;
    if (!email) {
      setMembership(null);
      return;
    }
    loadCustomerMembership(email)
      .then((m) => { if (!cancelled) setMembership(m); })
      .catch((err) => console.error('Failed to resolve customer membership for discount:', err));
    return () => { cancelled = true; };
  }, [quote.customerEmail]);

  const [showContract, setShowContract] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    materials: false,
    labor: false,
    process: false,
    payment: true
  });

  const [contractType, setContractType] = useState<'standard' | 'soroban-smart-contract'>('standard');
  const [paymentSchedule] = useState<PaymentScheduleItem[]>([
    {
      id: 'p1',
      type: 'deposit',
      description: 'Initial Deposit - Secures materials and scheduling',
      percentage: 30,
      amount: 8152,
      dueDate: '2026-03-20',
      status: 'pending'
    },
    {
      id: 'p2',
      type: 'milestone',
      description: 'Milestone 1 - After demolition and rough-in complete',
      percentage: 25,
      amount: 6793,
      milestone: 'Electrical & Plumbing Rough-In Complete',
      status: 'pending'
    },
    {
      id: 'p3',
      type: 'milestone',
      description: 'Milestone 2 - After cabinet and countertop installation',
      percentage: 25,
      amount: 6793,
      milestone: 'Cabinets & Countertops Installed',
      status: 'pending'
    },
    {
      id: 'p4',
      type: 'completion',
      description: 'Final Payment - Upon project completion and approval',
      percentage: 20,
      amount: 5435,
      milestone: 'Project Complete & Final Walkthrough',
      status: 'pending'
    }
  ]);

  const handleApprove = () => {
    setQuote({ ...quote, approvalStatus: 'approved' });
    toast.success('Quote Approved!', {
      description: 'Your contract is being generated...'
    });
    
    // Send notification to admin
    sendApprovedQuoteNotification({
      quoteNumber: quote.quoteNumber,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      projectTitle: quote.projectTitle,
      totalCost: quote.totalCost,
      approvedAt: new Date().toISOString()
    });
    
    // Simulate contract generation
    setTimeout(() => {
      setShowContract(true);
      toast.success('Contract Generated!', {
        description: 'Review your contract and payment schedule below'
      });
    }, 2000);
  };

  const handleReject = () => {
    toast.error('Quote rejected. We\'ll contact you to discuss revisions.');
    setQuote({ ...quote, approvalStatus: 'rejected' });
  };

  const toggleSection = (section: string) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };

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
                <p className="text-orange-100">Quote #{quote.quoteNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-white/90 text-sm">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Valid until {new Date(quote.validUntil).toLocaleDateString()}
              </span>
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
            <h2 className="text-2xl font-bold text-white mb-4">{quote.projectTitle}</h2>
            <p className="text-gray-400 mb-6">{quote.projectDescription}</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-[#ea580c] mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Customer</div>
                  <div className="text-white font-medium">{quote.customerName}</div>
                  <div className="text-gray-400 text-sm">{quote.customerEmail}</div>
                  <div className="text-gray-400 text-sm">{quote.customerPhone}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#ea580c] mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Project Location</div>
                  <div className="text-white font-medium">{quote.address}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Materials */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl mb-6 overflow-hidden">
            <button
              onClick={() => toggleSection('materials')}
              className="w-full flex items-center justify-between p-6 hover:bg-[#2A2A2A]/30 transition"
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-[#ea580c]" />
                <h3 className="text-xl font-bold text-white">Materials</h3>
                <span className="px-3 py-1 bg-[#ea580c]/20 text-[#ea580c] rounded-full text-sm font-semibold">
                  {quote.materials.length} items
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
                        <p className="text-gray-400 text-sm mb-2">{item.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-500">Qty: {item.quantity} {item.unit}</span>
                          <span className="text-gray-500">@ ${item.unitCost.toFixed(2)}/{item.unit}</span>
                          <span className="px-2 py-1 bg-[#2A2A2A] text-gray-400 rounded text-sm">{item.category}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-white">${item.totalCost.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[#2A2A2A] flex justify-between items-center">
                  <span className="text-gray-400 font-semibold">Materials Subtotal</span>
                  <span className="text-2xl font-bold text-white">${quote.materialsSubtotal.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Labor */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl mb-6 overflow-hidden">
            <button
              onClick={() => toggleSection('labor')}
              className="w-full flex items-center justify-between p-6 hover:bg-[#2A2A2A]/30 transition"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-[#ea580c]" />
                <h3 className="text-xl font-bold text-white">Labor</h3>
                <span className="px-3 py-1 bg-[#ea580c]/20 text-[#ea580c] rounded-full text-sm font-semibold">
                  {quote.labor.length} roles
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
                        <p className="text-gray-400 text-sm mb-2">{item.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{item.hours} hours</span>
                          <span>@ ${item.hourlyRate}/hour</span>
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

          {/* Process Steps */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl mb-6 overflow-hidden">
            <button
              onClick={() => toggleSection('process')}
              className="w-full flex items-center justify-between p-6 hover:bg-[#2A2A2A]/30 transition"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#ea580c]" />
                <h3 className="text-xl font-bold text-white">Project Process</h3>
                <span className="px-3 py-1 bg-[#ea580c]/20 text-[#ea580c] rounded-full text-sm font-semibold">
                  {quote.processSteps.length} steps
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
                        <p className="text-gray-400 text-sm mb-2">{step.description}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{step.estimatedDuration}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Total Cost */}
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0d0d0d] border border-[#ea580c]/30 rounded-2xl p-6 mb-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-gray-400">
                <span>Materials</span>
                <span className="font-semibold">${quote.materialsSubtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-gray-400">
                <span>Labor</span>
                <span className="font-semibold">${quote.laborSubtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-gray-400">
                <span>Tax ({(quote.taxRate * 100).toFixed(0)}%)</span>
                <span className="font-semibold">${quote.taxAmount.toLocaleString()}</span>
              </div>
              {discountPct > 0 && (
                <div className="flex justify-between items-center text-green-400">
                  <span className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    {isLandlordPlanId(membership?.planId)
                      ? 'Landlord Plan'
                      : (planTierLabel(membership?.tier) ? `${planTierLabel(membership?.tier)} Plan` : 'Member')} Discount ({discountPct}% off)
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
            <p className="text-gray-400">Your project cost of ${quote.totalCost.toLocaleString()} will be paid in 4 installments</p>
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
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">Deposit</div>
                  <div className="text-white font-bold">${paymentSchedule.find(p => p.type === 'deposit')?.amount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Milestones</div>
                  <div className="text-white font-bold">
                    ${paymentSchedule.filter(p => p.type === 'milestone').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Final</div>
                  <div className="text-white font-bold">${paymentSchedule.find(p => p.type === 'completion')?.amount.toLocaleString()}</div>
                </div>
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
          </div>
        </div>

        {/* ── E-SIGNATURE SECTION ── */}
        {approved || alreadySigned ? (
          <div className="bg-green-500/10 border-2 border-green-500/40 rounded-2xl p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Quote Approved & Signed!</h3>
            <p className="text-gray-400 mb-6">Thank you! Secure your project by paying your deposit now.</p>
          <button
            onClick={async () => {
              const depositAmt = Math.round(quote.totalCost * 0.30);
              const res = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/payments/create-checkout`,
                {
                  method: 'POST',
                  headers: await authedHeadersOrAnon(publicAnonKey),
                  body: JSON.stringify({
                    amount: depositAmt,
                    description: `30% Deposit — ${quote.projectTitle}`,
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
            Pay 30% Deposit — ${Math.round(quote.totalCost * 0.30).toLocaleString()}
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