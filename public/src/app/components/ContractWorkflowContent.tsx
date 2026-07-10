/**
 * Contract Workflow Content Component
 * 
 * Complete contract generation workflow:
 * 1. Select Approved Quote → Choose quote to convert to contract
 * 2. Configure Contract → Set terms, payment schedule, type
 * 3. Generate & Review → AI generates contract, review details
 * 4. Send for Signature → Digital signature workflow
 * 5. Track & Manage → Monitor signed contracts
 * 
 * Matches Quote Workflow visual style and layout
 */

import { useState } from 'react';
import {
  FileText, CheckCircle, Clock, DollarSign, Send, Download,
  Edit3, Eye, AlertCircle, Calendar, CreditCard, Shield,
  Zap, Users, Building, MapPin, Phone, Mail, Briefcase,
  Plus, Trash2, Copy, Settings, Activity, ArrowRight,
  ChevronRight, ChevronDown, X, Check, Star, Package,
  Tool, Image as ImageIcon, Sparkles, Link as LinkIcon,
  TrendingUp, BarChart3, FileSignature, Lock, Unlock,
  RefreshCw, Bell, MessageSquare, Archive, Layers,
  Palette, Save, EyeOff, Wrench, Box
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from './ui/button/PrimaryButton';

type QuoteStatus = 'pending' | 'approved' | 'rejected' | 'contract-sent' | 'contract-signed';
type ContractType = 'standard' | 'soroban-smart-contract';
type ContractStatus = 'draft' | 'pending-signature' | 'signed' | 'active' | 'completed';
type PaymentScheduleType = 'deposit' | 'milestone' | 'progress' | 'completion';
type ContractStep = 'select' | 'sections' | 'configure' | 'generate' | 'send' | 'track';

interface ApprovedQuote {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  businessName?: string;
  projectTitle: string;
  projectDescription: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  totalAmount: number;
  approvedDate: string;
  approvedBy: string;
  lineItems: LineItem[];
  designAssets?: any[];
  workRequestId: string;
  status: QuoteStatus;
  contractTypeSelected?: boolean;
  selectedContractType?: 'standard' | 'soroban-smart-contract';
  selectedPaymentSchedule?: string;
  contractTypeSelectionDate?: string;
  contractTypeRemindersSent?: number;
  lastReminderSent?: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface PaymentScheduleItem {
  id: string;
  type: PaymentScheduleType;
  description: string;
  percentage: number;
  amount: number;
  dueDate?: string;
  milestone?: string;
  status: 'pending' | 'paid' | 'overdue';
}

interface Contract {
  id: string;
  contractNumber: string;
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  projectTitle: string;
  totalAmount: number;
  contractType: ContractType;
  status: ContractStatus;
  terms: string;
  paymentSchedule: PaymentScheduleItem[];
  startDate: string;
  completionDate: string;
  createdDate: string;
  sentDate?: string;
  signedDate?: string;
  customerSignature?: string;
  companySignature?: string;
  sorobanContractId?: string;
  sorobanTransactionHash?: string;
  invoiceId?: string;
}

export default function ContractWorkflowContent() {
  const [currentStep, setCurrentStep] = useState<ContractStep>('select');
  const [selectedQuote, setSelectedQuote] = useState<ApprovedQuote | null>(null);
  const [currentContract, setCurrentContract] = useState<Contract | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [contractType, setContractType] = useState<ContractType>('standard');
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[]>([]);
  const [contractTerms, setContractTerms] = useState('');
  const [startDate, setStartDate] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    terms: true,
    payment: true,
    schedule: true,
    pending: true
  });
  const [viewMode, setViewMode] = useState<'all' | 'pending-selection' | 'ready'>('all');
  
  // Section selection state
  const [selectedSections, setSelectedSections] = useState({
    customerInfo: true,
    projectDetails: true,
    lineItems: true,
    pricing: true,
    timeline: true,
    terms: true,
    notes: true,
    customClauses: false
  });

  // Mock approved quotes (ready for contract)
  const approvedQuotes: ApprovedQuote[] = [
    {
      id: 'AQ-001',
      quoteNumber: 'QT-2026-045',
      customerName: 'Sarah Martinez',
      customerEmail: 'sarah@example.com',
      customerPhone: '(555) 123-4567',
      businessName: 'Martinez Residence',
      projectTitle: 'Complete Kitchen Remodel',
      projectDescription: 'Full kitchen renovation including new cabinets, countertops, appliances, electrical upgrades, plumbing modifications, and flooring.',
      address: '1234 Main Street',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      totalAmount: 59812.50,
      approvedDate: '2026-01-24',
      approvedBy: 'Sarah Martinez',
      status: 'approved',
      workRequestId: 'WR-2026-001',
      contractTypeSelected: false,
      contractTypeRemindersSent: 0,
      lineItems: [
        { id: '1', description: 'Labor - Kitchen Renovation', quantity: 1, unit: 'project', unitPrice: 14880, total: 14880 },
        { id: '2', description: 'Materials - Kitchen Package', quantity: 1, unit: 'package', unitPrice: 40120, total: 40120 }
      ]
    },
    {
      id: 'AQ-002',
      quoteNumber: 'QT-2026-067',
      customerName: 'Robert Chen',
      customerEmail: 'robert@example.com',
      customerPhone: '(555) 234-5678',
      businessName: 'Chen Family Home',
      projectTitle: 'Master Bathroom Update',
      projectDescription: 'Master bathroom remodel - replace tub with walk-in shower, new vanity, tile work, updated lighting and ventilation.',
      address: '5678 Oak Avenue',
      city: 'Palo Alto',
      state: 'CA',
      zip: '94301',
      totalAmount: 32150.75,
      approvedDate: '2026-01-23',
      approvedBy: 'Robert Chen',
      status: 'approved',
      workRequestId: 'WR-2026-002',
      contractTypeSelected: true,
      selectedContractType: 'soroban-smart-contract',
      selectedPaymentSchedule: 'milestone',
      contractTypeSelectionDate: '2026-01-23',
      lineItems: [
        { id: '1', description: 'Labor - Bathroom Remodel', quantity: 1, unit: 'project', unitPrice: 7750, total: 7750 },
        { id: '2', description: 'Materials - Bathroom Package', quantity: 1, unit: 'package', unitPrice: 21810, total: 21810 }
      ]
    },
    {
      id: 'AQ-003',
      quoteNumber: 'QT-2026-089',
      customerName: 'Emily Williams',
      customerEmail: 'emily@sunrisedental.com',
      customerPhone: '(555) 345-6789',
      businessName: 'Sunrise Dental Practice',
      projectTitle: 'Dental Office Expansion',
      projectDescription: 'Expand existing dental practice by adding 2 new treatment rooms, updating reception area, new flooring throughout 1,200 sq ft space.',
      address: '9012 Business Park Drive',
      city: 'San Jose',
      state: 'CA',
      zip: '95110',
      totalAmount: 87425.00,
      approvedDate: '2026-01-22',
      approvedBy: 'Emily Williams',
      status: 'approved',
      workRequestId: 'WR-2026-003',
      contractTypeSelected: false,
      contractTypeRemindersSent: 2,
      lastReminderSent: '2026-01-25',
      lineItems: [
        { id: '1', description: 'Labor - Commercial Renovation', quantity: 1, unit: 'project', unitPrice: 18880, total: 18880 },
        { id: '2', description: 'Materials - Commercial Package', quantity: 1, unit: 'package', unitPrice: 61680, total: 61680 }
      ]
    }
  ];

  // Generate contract from approved quote
  const generateContractFromQuote = async (quote: ApprovedQuote) => {
    setIsGenerating(true);
    setCurrentStep('generate');
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate payment schedule
    const schedule = generatePaymentSchedule(quote.totalAmount, contractType);
    
    // Generate contract terms
    const terms = generateContractTerms(quote, contractType);
    
    const contract: Contract = {
      id: `CT-${Date.now()}`,
      contractNumber: `CT-2026-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      projectTitle: quote.projectTitle,
      totalAmount: quote.totalAmount,
      contractType,
      status: 'draft',
      terms,
      paymentSchedule: schedule,
      startDate: startDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      completionDate: completionDate || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdDate: new Date().toISOString()
    };
    
    setCurrentContract(contract);
    setPaymentSchedule(schedule);
    setContractTerms(terms);
    setIsGenerating(false);
    toast.success('Contract auto-generated! Ready for review.');
  };

  // Generate payment schedule
  const generatePaymentSchedule = (total: number, type: ContractType): PaymentScheduleItem[] => {
    const schedules: PaymentScheduleItem[] = [];
    
    if (type === 'standard') {
      // Standard: Deposit, Progress, Completion
      schedules.push({
        id: 'PS-1',
        type: 'deposit',
        description: 'Initial Deposit (30%)',
        percentage: 30,
        amount: total * 0.30,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending'
      });
      schedules.push({
        id: 'PS-2',
        type: 'progress',
        description: 'Progress Payment (40%)',
        percentage: 40,
        amount: total * 0.40,
        milestone: '50% project completion',
        status: 'pending'
      });
      schedules.push({
        id: 'PS-3',
        type: 'completion',
        description: 'Final Payment (30%)',
        percentage: 30,
        amount: total * 0.30,
        milestone: 'Project completion and approval',
        status: 'pending'
      });
    } else {
      // Smart Contract: Automated milestones
      schedules.push({
        id: 'PS-1',
        type: 'deposit',
        description: 'Smart Contract Deposit (25%)',
        percentage: 25,
        amount: total * 0.25,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending'
      });
      schedules.push({
        id: 'PS-2',
        type: 'milestone',
        description: 'Milestone 1 - Demolition Complete (15%)',
        percentage: 15,
        amount: total * 0.15,
        milestone: 'Demolition and site prep verified',
        status: 'pending'
      });
      schedules.push({
        id: 'PS-3',
        type: 'milestone',
        description: 'Milestone 2 - Rough-In Complete (20%)',
        percentage: 20,
        amount: total * 0.20,
        milestone: 'Electrical and plumbing rough-in inspected',
        status: 'pending'
      });
      schedules.push({
        id: 'PS-4',
        type: 'milestone',
        description: 'Milestone 3 - Installation Complete (20%)',
        percentage: 20,
        amount: total * 0.20,
        milestone: 'Cabinets, counters, fixtures installed',
        status: 'pending'
      });
      schedules.push({
        id: 'PS-5',
        type: 'completion',
        description: 'Final Payment (20%)',
        percentage: 20,
        amount: total * 0.20,
        milestone: 'Final inspection passed and customer approval',
        status: 'pending'
      });
    }
    
    return schedules;
  };

  // Generate contract terms
  const generateContractTerms = (quote: ApprovedQuote, type: ContractType): string => {
    if (type === 'soroban-smart-contract') {
      return `SOROBAN SMART CONTRACT AGREEMENT

This Smart Contract Agreement ("Agreement") is executed on Soroban blockchain between the parties specified herein.

PROJECT: ${quote.projectTitle}
LOCATION: ${quote.address}, ${quote.city}, ${quote.state} ${quote.zip}
TOTAL CONTRACT AMOUNT: $${quote.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
QUOTE REFERENCE: ${quote.quoteNumber}

EXHIBIT A - INCORPORATED QUOTE
This Contract is created from and incorporates by reference the approved Quote ${quote.quoteNumber}, dated ${quote.approvedDate}, which is attached hereto as Exhibit A and made a part of this Contract. All terms, specifications, line items, pricing, and project details contained in the attached Quote are binding and enforceable as part of this Contract. In the event of any conflict between this Contract and Exhibit A, the terms of this Contract shall prevail.

1. SCOPE OF WORK
Contractor agrees to furnish all labor, materials, and services necessary to complete: ${quote.projectDescription}

All work shall be performed in accordance with the specifications and line items detailed in the attached Quote (Exhibit A).

2. SMART CONTRACT TERMS
2.1 This agreement is executed as a Soroban smart contract on Stellar blockchain
2.2 Payment milestones are automatically triggered upon milestone verification
2.3 Funds are held in escrow within the smart contract
2.4 Milestone verification requires customer approval or third-party inspection
2.5 Dispute resolution handled through multi-signature smart contract logic

3. PAYMENT SCHEDULE
Payments are automatically released upon milestone completion:
- Initial Deposit: 25% upon contract execution
- Milestone payments: Released upon verified completion
- Final Payment: 20% upon project completion and customer acceptance

4. BLOCKCHAIN VERIFICATION
4.1 All milestones recorded on Soroban blockchain
4.2 Photo/video evidence uploaded to IPFS and referenced in contract
4.3 Customer and contractor digital signatures required for milestone approval
4.4 Immutable record of all project progress and payments

5. TIMELINE
Project Start Date: [Specified upon contract execution]
Estimated Completion: [Specified upon contract execution]
Automated extensions triggered by force majeure or approved change orders

6. WARRANTY
Contractor warrants all work for 1 year from completion date, recorded in smart contract.

7. DISPUTE RESOLUTION
Disputes resolved through smart contract arbitration module with 3rd party arbitrators.

This smart contract agreement provides automated, transparent, and secure execution of the construction project.`;
    } else {
      return `CONSTRUCTION CONTRACT AGREEMENT

This Agreement is made on ${new Date().toLocaleDateString()} between the Contractor and Customer specified herein.

PROJECT: ${quote.projectTitle}
LOCATION: ${quote.address}, ${quote.city}, ${quote.state} ${quote.zip}
TOTAL CONTRACT AMOUNT: $${quote.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
QUOTE REFERENCE: ${quote.quoteNumber}

EXHIBIT A - INCORPORATED QUOTE
This Contract is created from and incorporates by reference the approved Quote ${quote.quoteNumber}, dated ${quote.approvedDate}, which is attached hereto as Exhibit A and made a part of this Contract. All terms, specifications, line items, pricing, and project details contained in the attached Quote are binding and enforceable as part of this Contract. In the event of any conflict between this Contract and Exhibit A, the terms of this Contract shall prevail.

1. SCOPE OF WORK
Contractor agrees to furnish all labor, materials, equipment, and services necessary to complete the following work in a professional and workmanlike manner: ${quote.projectDescription}

All work shall be performed in accordance with the specifications, line items, and details set forth in the attached Quote (Exhibit A), approved plans, specifications, and applicable building codes.

2. CONTRACT AMOUNT & PAYMENT TERMS
The total contract price is ${quote.totalAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}, payable as follows:
- 30% Deposit upon contract signing
- 40% Progress payment at 50% project completion
- 30% Final payment upon substantial completion and customer approval

3. PROJECT SCHEDULE
Work shall commence within 7 days of deposit receipt and shall be substantially completed within the timeframe specified, subject to delays beyond Contractor's control.

4. CHANGE ORDERS
Any changes to the scope of work must be documented in writing via change order and approved by both parties. Additional costs or time extensions will be agreed upon before work proceeds.

5. PERMITS & INSPECTIONS
Contractor shall obtain all necessary permits and schedule required inspections. Costs are included in contract amount unless otherwise specified.

6. WARRANTY
Contractor warrants all work against defects in workmanship for one (1) year from date of substantial completion. Manufacturer warranties apply to materials and equipment as specified.

7. INSURANCE & LIABILITY
Contractor maintains general liability and workers' compensation insurance. Certificate of insurance provided upon request.

8. PAYMENT TERMS
Payments are due within 5 business days of invoice. Late payments subject to 1.5% monthly interest charge.

9. CLEAN-UP
Contractor shall maintain job site in orderly condition and perform final clean-up upon completion.

10. DISPUTE RESOLUTION
Any disputes shall first attempt resolution through mediation before pursuing legal action.

By signing below, parties agree to all terms and conditions outlined in this agreement.`;
    }
  };

  // Send contract for signature
  const sendContractForSignature = () => {
    if (!currentContract) return;
    
    setCurrentContract({ ...currentContract, status: 'pending-signature', sentDate: new Date().toISOString() });
    toast.success('Contract sent to customer for digital signature!');
    setCurrentStep('send');
  };

  // Send contract type selection reminder
  const sendContractTypeReminder = (quote: ApprovedQuote) => {
    toast.success(`Reminder sent to ${quote.customerName} to select contract type`);
    // In real app: API call to send email/SMS reminder
  };

  // Resend contract type selection
  const resendContractTypeSelection = (quote: ApprovedQuote) => {
    toast.success(`Contract type selection request resent to ${quote.customerName}`);
    // In real app: API call to send new selection link
  };

  // Filter quotes based on view mode
  const getFilteredQuotes = () => {
    if (viewMode === 'pending-selection') {
      return approvedQuotes.filter(q => !q.contractTypeSelected);
    } else if (viewMode === 'ready') {
      return approvedQuotes.filter(q => q.contractTypeSelected);
    }
    return approvedQuotes;
  };

  // Get stats
  const pendingSelectionCount = approvedQuotes.filter(q => !q.contractTypeSelected).length;
  const readyForContractCount = approvedQuotes.filter(q => q.contractTypeSelected).length;

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Get step status
  const getStepStatus = (step: ContractStep) => {
    const steps: ContractStep[] = ['select', 'sections', 'configure', 'generate', 'send', 'track'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };
  
  // Toggle section selection
  const toggleSectionSelection = (section: keyof typeof selectedSections) => {
    setSelectedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Toggle all sections
  const toggleAllSections = (value: boolean) => {
    setSelectedSections({
      customerInfo: value,
      projectDetails: value,
      lineItems: value,
      pricing: value,
      timeline: value,
      terms: value,
      notes: value,
      customClauses: value
    });
  };
  
  // Get selected sections count
  const getSelectedSectionsCount = () => {
    return Object.values(selectedSections).filter(Boolean).length;
  };

  return (
    <>
      {/* Workflow Steps - Matches Quote Workflow Style */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center justify-between">
          {[
            { step: 'select' as ContractStep, label: 'Select Quote', icon: FileText },
            { step: 'sections' as ContractStep, label: 'Choose Sections', icon: Layers },
            { step: 'configure' as ContractStep, label: 'Choose Style', icon: Palette },
            { step: 'generate' as ContractStep, label: 'Generate & Review', icon: Sparkles },
            { step: 'send' as ContractStep, label: 'Send for Signature', icon: Send },
            { step: 'track' as ContractStep, label: 'Track & Manage', icon: Activity }
          ].map((item, index) => {
            const status = getStepStatus(item.step);
            const Icon = item.icon;
            
            return (
              <div key={item.step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all ${
                    status === 'completed'
                      ? 'bg-green-600 text-white'
                      : status === 'current'
                      ? 'bg-gradient-to-br from-[#ea580c] to-[#c2410c] text-white shadow-lg shadow-[#ea580c]/20'
                      : 'bg-[#2A2A2A] text-gray-500'
                  }`}>
                    {status === 'completed' ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                  </div>
                  <p className={`text-xs font-medium text-center ${
                    status === 'current' ? 'text-[#ea580c]' : status === 'completed' ? 'text-green-400' : 'text-gray-500'
                  }`}>
                    {item.label}
                  </p>
                </div>
                {index < 4 && (
                  <div className={`h-0.5 flex-1 mx-2 transition-all ${
                    status === 'completed' || getStepStatus(['select', 'configure', 'generate', 'send', 'track'][index + 1]) === 'completed'
                      ? 'bg-green-600'
                      : 'bg-[#2A2A2A]'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Select Approved Quote */}
      {currentStep === 'select' && (
        <div className="space-y-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setViewMode('all')}
              className={`bg-[#1A1A1A] rounded-xl border-2 p-4 transition-all ${
                viewMode === 'all' ? 'border-[#ea580c] bg-[#ea580c]/5' : 'border-[#2A2A2A] hover:border-[#ea580c]/50'
              }`}
            >
              <p className="text-xs text-gray-500 mb-1">All Approved Quotes</p>
              <p className="text-3xl font-bold text-white">{approvedQuotes.length}</p>
            </button>
            <button
              onClick={() => setViewMode('pending-selection')}
              className={`bg-[#1A1A1A] rounded-xl border-2 p-4 transition-all ${
                viewMode === 'pending-selection' ? 'border-[#ea580c] bg-[#ea580c]/5' : 'border-[#2A2A2A] hover:border-[#ea580c]/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500">Pending Contract Type</p>
                {pendingSelectionCount > 0 && (
                  <span className="px-2 py-0.5 bg-orange-600/20 text-orange-400 text-xs font-bold rounded-full border border-orange-500/30">
                    {pendingSelectionCount}
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold text-orange-400">{pendingSelectionCount}</p>
            </button>
            <button
              onClick={() => setViewMode('ready')}
              className={`bg-[#1A1A1A] rounded-xl border-2 p-4 transition-all ${
                viewMode === 'ready' ? 'border-[#ea580c] bg-[#ea580c]/5' : 'border-[#2A2A2A] hover:border-[#ea580c]/50'
              }`}
            >
              <p className="text-xs text-gray-500 mb-1">Ready for Contract</p>
              <p className="text-3xl font-bold text-green-400">{readyForContractCount}</p>
            </button>
          </div>

          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#ea580c]" />
              Select Approved Quote
              {viewMode === 'pending-selection' && (
                <span className="text-sm font-normal text-gray-400">
                  (Awaiting customer contract type selection)
                </span>
              )}
            </h2>
            <p className="text-gray-400 mb-6">
              {viewMode === 'pending-selection'
                ? 'These customers have approved their quotes but haven\'t selected a contract type yet'
                : viewMode === 'ready'
                ? 'These customers have selected their preferred contract type and are ready for contract generation'
                : 'Choose an approved quote to convert into a contract'}
            </p>
            
            <div className="space-y-3">
              {getFilteredQuotes().map((quote) => (
                <div
                  key={quote.id}
                  className={`bg-[#0A0A0A] rounded-xl border-2 p-6 cursor-pointer transition-all hover:border-[#ea580c]/50 ${
                    selectedQuote?.id === quote.id ? 'border-[#ea580c] bg-[#ea580c]/5' : 'border-[#2A2A2A]'
                  }`}
                  onClick={() => setSelectedQuote(quote)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs text-gray-500">{quote.quoteNumber}</p>
                        {!quote.contractTypeSelected && (
                          <span className="px-2 py-0.5 bg-orange-600/20 text-orange-400 text-xs font-bold rounded-full border border-orange-500/30">
                            PENDING SELECTION
                          </span>
                        )}
                        {quote.contractTypeSelected && quote.selectedContractType && (
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${
                            quote.selectedContractType === 'soroban-smart-contract'
                              ? 'bg-purple-600/20 text-purple-400 border-purple-500/30'
                              : 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                          }`}>
                            {quote.selectedContractType === 'soroban-smart-contract' ? 'SMART CONTRACT' : 'STANDARD'}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1">{quote.projectTitle}</h3>
                      <p className="text-sm text-gray-400">{quote.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400">
                        ${quote.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-green-600/20 text-green-400 border border-green-500/30">
                        APPROVED
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Approved</p>
                        <p className="text-sm text-white">{new Date(quote.approvedDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Location</p>
                        <p className="text-sm text-white">{quote.city}, {quote.state}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Customer</p>
                        <p className="text-sm text-white">{quote.businessName || 'Residential'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-400 line-clamp-2">{quote.projectDescription}</p>
                  
                  {/* Contract Type Selection Status */}
                  {!quote.contractTypeSelected && (
                    <div className="mt-4 p-3 bg-orange-600/10 border border-orange-500/30 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-orange-400 mb-1">Customer hasn't selected contract type yet</p>
                          {quote.contractTypeRemindersSent && quote.contractTypeRemindersSent > 0 && (
                            <p className="text-xs text-gray-400">
                              {quote.contractTypeRemindersSent} reminder{quote.contractTypeRemindersSent > 1 ? 's' : ''} sent
                              {quote.lastReminderSent && ` • Last: ${new Date(quote.lastReminderSent).toLocaleDateString()}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              sendContractTypeReminder(quote);
                            }}
                            className="px-3 py-1.5 bg-orange-600/20 border border-orange-500/30 text-orange-400 text-xs font-semibold rounded-lg hover:bg-orange-600/30 transition"
                          >
                            Send Reminder
                          </button>
                          <PrimaryButton
                            onClick={(e) => {
                              e.stopPropagation();
                              resendContractTypeSelection(quote);
                            }}
                            className="!px-3 !py-1.5 !text-xs"
                          >
                            Resend Selection
                          </PrimaryButton>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ready to Generate Contract */}
                  {quote.contractTypeSelected && selectedQuote?.id === quote.id && (
                    <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-[#ea580c] mb-1">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">Selected</span>
                          </div>
                          {quote.selectedContractType && (
                            <p className="text-xs text-gray-400">
                              Customer chose: {quote.selectedContractType === 'soroban-smart-contract' ? 'Soroban Smart Contract' : 'Standard Contract'}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (quote.selectedContractType) {
                              setContractType(quote.selectedContractType);
                            }
                            setCurrentStep('sections');
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white font-semibold rounded-xl hover:from-[#c2410c] hover:to-[#ea580c] transition flex items-center gap-2"
                        >
                          Choose Sections
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Can still select quotes without contract type for admin override */}
                  {!quote.contractTypeSelected && selectedQuote?.id === quote.id && (
                    <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[#ea580c]">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">Selected (Admin Override)</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentStep('sections');
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white font-semibold rounded-xl hover:from-[#c2410c] hover:to-[#ea580c] transition flex items-center gap-2"
                        >
                          Choose Sections
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Choose Sections from Quote */}
      {currentStep === 'sections' && selectedQuote && (
        <div className="space-y-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Layers className="w-6 h-6 text-[#ea580c]" />
                  Choose Quote Sections for Contract
                </h2>
                <p className="text-gray-400">Select which parts of the quote to include in the contract</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#ea580c]">{getSelectedSectionsCount()}/8</div>
                <div className="text-xs text-gray-500">Sections Selected</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#2A2A2A]">
              <button
                onClick={() => toggleAllSections(true)}
                className="px-4 py-2 bg-green-600/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-600/30 transition font-medium text-sm flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Select All
              </button>
              <button
                onClick={() => toggleAllSections(false)}
                className="px-4 py-2 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-600/30 transition font-medium text-sm flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Deselect All
              </button>
              <div className="flex-1"></div>
              <div className="text-sm text-gray-400">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                You can customize each section before finalizing
              </div>
            </div>

            {/* Quote Preview Info */}
            <div className="bg-gradient-to-r from-[#ea580c]/10 to-[#c2410c]/10 border border-[#ea580c]/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ea580c] to-[#c2410c] flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white">{selectedQuote.quoteNumber}</h3>
                    <span className="px-2 py-0.5 bg-green-600/20 text-green-400 text-xs font-bold rounded-full border border-green-500/30">
                      APPROVED
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{selectedQuote.projectTitle}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{selectedQuote.customerName}</span>
                    <span>•</span>
                    <span>${selectedQuote.totalAmount.toLocaleString()}</span>
                    <span>•</span>
                    <span>{selectedQuote.lineItems.length} Line Items</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Selection Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Customer Information */}
              <button
                onClick={() => toggleSectionSelection('customerInfo')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  selectedSections.customerInfo
                    ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                    : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#3A3A3A]'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedSections.customerInfo ? 'bg-green-600' : 'bg-[#2A2A2A]'
                  }`}>
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedSections.customerInfo
                      ? 'border-green-500 bg-green-500'
                      : 'border-[#3A3A3A] bg-transparent'
                  }`}>
                    {selectedSections.customerInfo && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
                <h3 className="font-bold text-white mb-1">Customer Information</h3>
                <p className="text-xs text-gray-400 mb-2">Name, email, phone, business details</p>
                <div className="text-xs text-gray-500">
                  {selectedQuote.customerName} • {selectedQuote.customerEmail}
                </div>
              </button>

              {/* Project Details */}
              <button
                onClick={() => toggleSectionSelection('projectDetails')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  selectedSections.projectDetails
                    ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                    : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#3A3A3A]'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedSections.projectDetails ? 'bg-green-600' : 'bg-[#2A2A2A]'
                  }`}>
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedSections.projectDetails
                      ? 'border-green-500 bg-green-500'
                      : 'border-[#3A3A3A] bg-transparent'
                  }`}>
                    {selectedSections.projectDetails && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
                <h3 className="font-bold text-white mb-1">Project Details</h3>
                <p className="text-xs text-gray-400 mb-2">Title, description, location, scope</p>
                <div className="text-xs text-gray-500 truncate">
                  {selectedQuote.projectTitle}
                </div>
              </button>

              {/* Line Items */}
              <button
                onClick={() => toggleSectionSelection('lineItems')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  selectedSections.lineItems
                    ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                    : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#3A3A3A]'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedSections.lineItems ? 'bg-green-600' : 'bg-[#2A2A2A]'
                  }`}>
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedSections.lineItems
                      ? 'border-green-500 bg-green-500'
                      : 'border-[#3A3A3A] bg-transparent'
                  }`}>
                    {selectedSections.lineItems && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
                <h3 className="font-bold text-white mb-1">Line Items</h3>
                <p className="text-xs text-gray-400 mb-2">Itemized services and products list</p>
                <div className="text-xs text-gray-500">
                  {selectedQuote.lineItems.length} items included
                </div>
              </button>

              {/* Pricing & Total */}
              <button
                onClick={() => toggleSectionSelection('pricing')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  selectedSections.pricing
                    ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                    : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#3A3A3A]'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedSections.pricing ? 'bg-green-600' : 'bg-[#2A2A2A]'
                  }`}>
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedSections.pricing
                      ? 'border-green-500 bg-green-500'
                      : 'border-[#3A3A3A] bg-transparent'
                  }`}>
                    {selectedSections.pricing && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
                <h3 className="font-bold text-white mb-1">Pricing & Total</h3>
                <p className="text-xs text-gray-400 mb-2">Total amount, subtotals, taxes</p>
                <div className="text-xs text-gray-500">
                  Total: ${selectedQuote.totalAmount.toLocaleString()}
                </div>
              </button>

              {/* Timeline & Dates */}
              <button
                onClick={() => toggleSectionSelection('timeline')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  selectedSections.timeline
                    ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                    : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#3A3A3A]'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedSections.timeline ? 'bg-green-600' : 'bg-[#2A2A2A]'
                  }`}>
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedSections.timeline
                      ? 'border-green-500 bg-green-500'
                      : 'border-[#3A3A3A] bg-transparent'
                  }`}>
                    {selectedSections.timeline && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
                <h3 className="font-bold text-white mb-1">Timeline & Dates</h3>
                <p className="text-xs text-gray-400 mb-2">Start date, completion date, milestones</p>
                <div className="text-xs text-gray-500">
                  Project schedule and deadlines
                </div>
              </button>

              {/* Terms & Conditions */}
              <button
                onClick={() => toggleSectionSelection('terms')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  selectedSections.terms
                    ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                    : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#3A3A3A]'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedSections.terms ? 'bg-green-600' : 'bg-[#2A2A2A]'
                  }`}>
                    <FileSignature className="w-5 h-5 text-white" />
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedSections.terms
                      ? 'border-green-500 bg-green-500'
                      : 'border-[#3A3A3A] bg-transparent'
                  }`}>
                    {selectedSections.terms && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
                <h3 className="font-bold text-white mb-1">Terms & Conditions</h3>
                <p className="text-xs text-gray-400 mb-2">Legal terms, warranties, guarantees</p>
                <div className="text-xs text-gray-500">
                  Standard contract terms
                </div>
              </button>

              {/* Notes & Special Instructions */}
              <button
                onClick={() => toggleSectionSelection('notes')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  selectedSections.notes
                    ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                    : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#3A3A3A]'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedSections.notes ? 'bg-green-600' : 'bg-[#2A2A2A]'
                  }`}>
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedSections.notes
                      ? 'border-green-500 bg-green-500'
                      : 'border-[#3A3A3A] bg-transparent'
                  }`}>
                    {selectedSections.notes && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
                <h3 className="font-bold text-white mb-1">Notes & Instructions</h3>
                <p className="text-xs text-gray-400 mb-2">Special notes, instructions, comments</p>
                <div className="text-xs text-gray-500">
                  Additional project information
                </div>
              </button>

              {/* Custom Clauses */}
              <button
                onClick={() => toggleSectionSelection('customClauses')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  selectedSections.customClauses
                    ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                    : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#3A3A3A]'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedSections.customClauses ? 'bg-green-600' : 'bg-[#2A2A2A]'
                  }`}>
                    <Edit3 className="w-5 h-5 text-white" />
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedSections.customClauses
                      ? 'border-green-500 bg-green-500'
                      : 'border-[#3A3A3A] bg-transparent'
                  }`}>
                    {selectedSections.customClauses && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
                <h3 className="font-bold text-white mb-1">Custom Clauses</h3>
                <p className="text-xs text-gray-400 mb-2">Add custom legal or business clauses</p>
                <div className="text-xs text-gray-500">
                  Optional customizations
                </div>
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentStep('select')}
                className="px-6 py-3 bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-medium"
              >
                Back to Quotes
              </button>
              <div className="flex items-center gap-3">
                <div className="text-right mr-4">
                  <div className="text-sm font-medium text-white">
                    {getSelectedSectionsCount() === 0 ? (
                      <span className="text-red-400">⚠️ Select at least one section</span>
                    ) : (
                      <span className="text-green-400">✓ {getSelectedSectionsCount()} sections selected</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">Ready to choose contract style</div>
                </div>
                <button
                  onClick={() => {
                    if (getSelectedSectionsCount() === 0) {
                      toast.error('Please select at least one section to include in the contract');
                      return;
                    }
                    setCurrentStep('configure');
                    toast.success(`${getSelectedSectionsCount()} sections selected for contract`);
                  }}
                  disabled={getSelectedSectionsCount() === 0}
                  className="px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-xl hover:from-[#c2410c] hover:to-[#ea580c] transition font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#ea580c]/20"
                >
                  Continue to Style Selection
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Choose Contract Style */}
      {currentStep === 'configure' && selectedQuote && (
        <div className="space-y-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Palette className="w-6 h-6 text-[#ea580c]" />
                  Choose Contract Style & Configuration
                </h2>
                <p className="text-gray-400">Select contract type, payment schedule, and timeline</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-green-400 font-medium">✓ {getSelectedSectionsCount()} Sections Included</div>
                <div className="text-xs text-gray-500">From quote selection</div>
              </div>
            </div>
            
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-3 mb-6">
              <p className="text-sm text-blue-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                The selected sections will be formatted according to the contract style you choose below
              </p>
            </div>
            
            {/* Contract Type Selection */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-400 mb-3 block">Contract Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setContractType('standard')}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    contractType === 'standard'
                      ? 'border-[#ea580c] bg-[#ea580c]/10'
                      : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#ea580c]/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Standard Contract</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">Traditional contract with 3-payment schedule (deposit, progress, final)</p>
                  <div className="flex items-center gap-2">
                    {contractType === 'standard' && (
                      <>
                        <CheckCircle className="w-4 h-4 text-[#ea580c]" />
                        <span className="text-xs font-medium text-[#ea580c]">Selected</span>
                      </>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setContractType('soroban-smart-contract')}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    contractType === 'soroban-smart-contract'
                      ? 'border-[#ea580c] bg-[#ea580c]/10'
                      : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#ea580c]/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Soroban Smart Contract</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">Blockchain-based smart contract with automated milestone payments and verification</p>
                  <div className="flex items-center gap-2">
                    {contractType === 'soroban-smart-contract' && (
                      <>
                        <CheckCircle className="w-4 h-4 text-[#ea580c]" />
                        <span className="text-xs font-medium text-[#ea580c]">Selected</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Project Dates */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Project Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Expected Completion Date</label>
                <input
                  type="date"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentStep('select')}
                className="px-6 py-3 bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-medium"
              >
                Back
              </button>
              <button
                onClick={() => generateContractFromQuote(selectedQuote)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white font-bold rounded-xl hover:from-[#c2410c] hover:to-[#ea580c] transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Generate Contract with AI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Generate & Review */}
      {currentStep === 'generate' && currentContract && !isGenerating && (
        <div className="space-y-4">
          {/* Contract Overview */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-[#ea580c]" />
                  Review Contract
                </h2>
                <p className="text-gray-400">AI-generated contract ready for review</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Contract #</p>
                <p className="text-lg font-bold text-white">{currentContract.contractNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
                <p className="text-xs text-gray-500 mb-1">Contract Type</p>
                <p className="text-sm font-bold text-white">
                  {currentContract.contractType === 'soroban-smart-contract' ? 'Smart Contract' : 'Standard'}
                </p>
              </div>
              <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
                <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                <p className="text-sm font-bold text-green-400">
                  ${currentContract.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
                <p className="text-xs text-gray-500 mb-1">Start Date</p>
                <p className="text-sm font-bold text-white">{new Date(currentContract.startDate).toLocaleDateString()}</p>
              </div>
              <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
                <p className="text-xs text-gray-500 mb-1">Completion</p>
                <p className="text-sm font-bold text-white">{new Date(currentContract.completionDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
            <button
              onClick={() => toggleSection('payment')}
              className="w-full p-6 flex items-center justify-between hover:bg-[#2A2A2A]/30 transition rounded-t-2xl"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-[#ea580c]" />
                <h3 className="text-lg font-bold text-white">Payment Schedule</h3>
                <span className="px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-xs font-bold text-gray-400">
                  {paymentSchedule.length} Payments
                </span>
              </div>
              {expandedSections.payment ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.payment && (
              <div className="p-6 pt-0 space-y-3">
                {paymentSchedule.map((payment, index) => (
                  <div
                    key={payment.id}
                    className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                          payment.type === 'deposit' ? 'bg-blue-600/20 text-blue-400' :
                          payment.type === 'milestone' ? 'bg-purple-600/20 text-purple-400' :
                          payment.type === 'progress' ? 'bg-orange-600/20 text-orange-400' :
                          'bg-green-600/20 text-green-400'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{payment.description}</p>
                          {payment.milestone && (
                            <p className="text-xs text-gray-400 mt-1">Milestone: {payment.milestone}</p>
                          )}
                          {payment.dueDate && (
                            <p className="text-xs text-gray-400 mt-1">Due: {new Date(payment.dueDate).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">
                          ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500">{payment.percentage}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contract Terms */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
            <button
              onClick={() => toggleSection('terms')}
              className="w-full p-6 flex items-center justify-between hover:bg-[#2A2A2A]/30 transition rounded-t-2xl"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-[#ea580c]" />
                <h3 className="text-lg font-bold text-white">Contract Terms & Conditions</h3>
              </div>
              {expandedSections.terms ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.terms && (
              <div className="p-6 pt-0">
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{contractTerms}</pre>
                </div>
              </div>
            )}
          </div>

          {/* Exhibit A - Attached Quote */}
          {selectedQuote && (
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
              <div className="p-6 border-b border-[#2A2A2A]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Exhibit A - Attached Quote</h3>
                      <p className="text-sm text-gray-400">Incorporated by reference into this contract</p>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-green-600/20 border border-green-500/30 text-green-400 text-xs font-bold rounded-full">
                    BINDING
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/30 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-green-300 font-medium mb-1">Legal Notice</p>
                      <p className="text-xs text-green-400/80">
                        The quote attached as Exhibit A is legally binding and forms an integral part of this contract. 
                        All specifications, line items, and pricing in the quote are enforceable contract terms.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quote Header Info */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
                    <p className="text-xs text-gray-500 mb-1">Quote Number</p>
                    <p className="text-sm font-bold text-white">{selectedQuote.quoteNumber}</p>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
                    <p className="text-xs text-gray-500 mb-1">Approved Date</p>
                    <p className="text-sm font-bold text-white">{new Date(selectedQuote.approvedDate).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
                    <p className="text-xs text-gray-500 mb-1">Quote Total</p>
                    <p className="text-sm font-bold text-green-400">${selectedQuote.totalAmount.toLocaleString()}</p>
                  </div>
                </div>

                {/* Project Details */}
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4 mb-4">
                  <h4 className="text-sm font-bold text-white mb-3">Project Details</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">Project Title</p>
                      <p className="text-sm text-gray-300">{selectedQuote.projectTitle}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-sm text-gray-300">
                        {selectedQuote.address}, {selectedQuote.city}, {selectedQuote.state} {selectedQuote.zip}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Description</p>
                      <p className="text-sm text-gray-300">{selectedQuote.projectDescription}</p>
                    </div>
                  </div>
                </div>

                {/* Line Items from Quote */}
                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
                  <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#ea580c]" />
                    Line Items ({selectedQuote.lineItems.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedQuote.lineItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 border-b border-[#2A2A2A] last:border-b-0"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-6 h-6 rounded bg-[#2A2A2A] flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-300">{item.description}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {item.quantity} {item.unit} × ${item.unitPrice.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-white ml-4">
                          ${item.total.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#2A2A2A] flex items-center justify-between">
                    <p className="text-sm font-bold text-white">Total Amount</p>
                    <p className="text-lg font-bold text-green-400">
                      ${selectedQuote.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Document Management */}
                <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <FileText className="w-4 h-4" />
                      <span>Quote stored in: <code className="text-[#ea580c] font-mono text-xs">/contracts/{currentContract.contractNumber}/exhibit-a-{selectedQuote.quoteNumber}.pdf</code></span>
                    </div>
                    <button
                      onClick={() => toast.success(`Exhibit A (${selectedQuote.quoteNumber}) downloaded`)}
                      className="px-3 py-1.5 bg-green-600/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-600/30 transition text-xs font-medium flex items-center gap-2"
                    >
                      <Download className="w-3 h-3" />
                      Download Quote
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentStep('sections')}
                className="px-6 py-3 bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-medium"
              >
                Back to Sections
              </button>
              <button
                onClick={() => toast.success('Contract saved as draft')}
                className="px-6 py-3 bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-medium flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              <button
                onClick={() => toast.success('Contract downloaded as PDF')}
                className="px-6 py-3 bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-medium flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                onClick={sendContractForSignature}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white font-bold rounded-xl hover:from-[#c2410c] hover:to-[#ea580c] transition flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Send for Signature
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Send for Signature */}
      {currentStep === 'send' && currentContract && (
        <div className="space-y-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Contract Sent Successfully!</h2>
              <p className="text-gray-400 mb-8">
                {currentContract.customerName} will receive an email with the contract and digital signature request.
              </p>
              
              <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 max-w-2xl mx-auto mb-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-left">
                    <p className="text-xs text-gray-500 mb-1">Contract Number</p>
                    <p className="text-sm font-bold text-white">{currentContract.contractNumber}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-gray-500 mb-1">Customer</p>
                    <p className="text-sm font-bold text-white">{currentContract.customerName}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-gray-500 mb-1">Amount</p>
                    <p className="text-sm font-bold text-green-400">
                      ${currentContract.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-gray-500 mb-1">Sent Date</p>
                    <p className="text-sm font-bold text-white">
                      {currentContract.sentDate ? new Date(currentContract.sentDate).toLocaleDateString() : 'Just now'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setCurrentStep('track')}
                  className="px-8 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white font-bold rounded-xl hover:from-[#c2410c] hover:to-[#ea580c] transition flex items-center gap-2"
                >
                  View Tracking Dashboard
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Track & Manage */}
      {currentStep === 'track' && (
        <div className="space-y-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-6 h-6 text-[#ea580c]" />
              Contract Tracking Dashboard
            </h2>
            <p className="text-gray-400 mb-6">Monitor all contracts and their signature status</p>
            
            <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-8 text-center">
              <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Awaiting Customer Signature</h3>
              <p className="text-sm text-gray-400 mb-6">
                Contract has been sent to customer. Notification will appear when signed.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => toast.success('Reminder email sent to customer')}
                  className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-medium flex items-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Send Reminder
                </button>
                <button
                  onClick={() => toast.success('Contract link copied to clipboard')}
                  className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-medium flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Signature Link
                </button>
              </div>
            </div>
          </div>

          {/* Start New Contract */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <button
              onClick={() => {
                setCurrentStep('select');
                setSelectedQuote(null);
                setCurrentContract(null);
              }}
              className="w-full px-6 py-4 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white font-bold rounded-xl hover:from-[#c2410c] hover:to-[#ea580c] transition flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Another Contract
            </button>
          </div>
        </div>
      )}

      {/* Generating Animation */}
      {isGenerating && (
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-12">
          <div className="text-center">
            <div className="w-20 h-20 bg-[#ea580c]/20 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Sparkles className="w-10 h-10 text-[#ea580c]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Generating Contract with AI...</h3>
            <p className="text-gray-400 mb-6">
              Creating payment schedule, terms, and conditions
            </p>
            <div className="max-w-md mx-auto">
              <div className="w-full bg-[#2A2A2A] rounded-full h-2">
                <div className="bg-gradient-to-r from-[#ea580c] to-[#c2410c] h-2 rounded-full animate-pulse" style={{ width: '70%' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
