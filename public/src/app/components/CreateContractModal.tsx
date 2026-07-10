/**
 * Create Contract Modal
 * Modal for creating new contracts from scratch or from approved quotes
 */

import { useState, useEffect } from 'react';
import {
  X, FileText, DollarSign, Calendar, User, Building2, Mail, Phone,
  MapPin, Search, ChevronDown, AlertCircle, CheckCircle, Clock,
  Plus, Trash2, Edit2, Save, ArrowRight, Package, Wrench, FileSignature
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContractCreated: (contract: any) => void;
}

interface Quote {
  id: string;
  title: string;
  client: string;
  amount: number;
  status: 'approved' | 'accepted';
  createdDate: string;
}

interface PaymentTerm {
  id: string;
  description: string;
  percentage: number;
  amount: number;
  dueDate: string;
}

export default function CreateContractModal({
  isOpen,
  onClose,
  onContractCreated
}: CreateContractModalProps) {
  const [step, setStep] = useState<'method' | 'select-quote' | 'details' | 'terms' | 'review'>('method');
  const [creationMethod, setCreationMethod] = useState<'from-quote' | 'from-scratch' | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  
  // Contract Details
  const [contractTitle, setContractTitle] = useState('');
  const [contractType, setContractType] = useState<'service' | 'sales' | 'nda' | 'employment' | 'vendor'>('service');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [contractValue, setContractValue] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  
  // Payment Terms
  const [paymentSchedule, setPaymentSchedule] = useState<'full' | 'deposit' | 'milestone'>('deposit');
  const [depositPercentage, setDepositPercentage] = useState(50);
  const [customTerms, setCustomTerms] = useState<PaymentTerm[]>([]);
  
  // Mock approved quotes
  const approvedQuotes: Quote[] = [
    {
      id: 'QT-001',
      title: 'HVAC System Installation',
      client: 'Tech Corp Solutions',
      amount: 15400,
      status: 'approved',
      createdDate: '2026-02-20'
    },
    {
      id: 'QT-002',
      title: 'Office Renovation',
      client: 'BuildCo Properties',
      amount: 89500,
      status: 'accepted',
      createdDate: '2026-02-18'
    },
    {
      id: 'QT-003',
      title: 'Plumbing System Upgrade',
      client: 'Premier Suppliers Inc',
      amount: 6750,
      status: 'approved',
      createdDate: '2026-02-15'
    }
  ];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('method');
        setCreationMethod(null);
        setSelectedQuote(null);
        resetForm();
      }, 300);
    }
  }, [isOpen]);

  const resetForm = () => {
    setContractTitle('');
    setContractType('service');
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setClientAddress('');
    setContractValue(0);
    setStartDate('');
    setEndDate('');
    setAssignedTo('');
    setPaymentSchedule('deposit');
    setDepositPercentage(50);
    setCustomTerms([]);
  };

  const handleQuoteSelect = (quote: Quote) => {
    setSelectedQuote(quote);
    setContractTitle(quote.title + ' - Service Agreement');
    setClientName(quote.client);
    setContractValue(quote.amount);
    setStep('details');
  };

  const calculatePaymentTerms = (): PaymentTerm[] => {
    const total = contractValue;
    
    if (paymentSchedule === 'full') {
      return [{
        id: '1',
        description: 'Full Payment',
        percentage: 100,
        amount: total,
        dueDate: 'Upon contract signing'
      }];
    } else if (paymentSchedule === 'deposit') {
      const depositAmount = total * (depositPercentage / 100);
      const balanceAmount = total - depositAmount;
      return [
        {
          id: '1',
          description: 'Deposit',
          percentage: depositPercentage,
          amount: depositAmount,
          dueDate: 'Upon contract signing'
        },
        {
          id: '2',
          description: 'Final Payment',
          percentage: 100 - depositPercentage,
          amount: balanceAmount,
          dueDate: 'Upon completion'
        }
      ];
    } else {
      // Milestone payment
      return [
        {
          id: '1',
          description: 'Deposit',
          percentage: 33,
          amount: total * 0.33,
          dueDate: 'Upon contract signing'
        },
        {
          id: '2',
          description: 'Progress Payment',
          percentage: 34,
          amount: total * 0.34,
          dueDate: 'At 50% completion'
        },
        {
          id: '3',
          description: 'Final Payment',
          percentage: 33,
          amount: total * 0.33,
          dueDate: 'Upon completion'
        }
      ];
    }
  };

  const handleCreateContract = () => {
    const paymentTerms = calculatePaymentTerms();
    
    const newContract = {
      id: `CNT-${Date.now()}`,
      title: contractTitle,
      client: clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      type: contractType,
      value: contractValue,
      status: 'draft' as const,
      createdDate: new Date().toISOString().split('T')[0],
      startDate,
      endDate,
      assignedTo,
      paymentTerms,
      sourceQuoteId: selectedQuote?.id
    };

    onContractCreated(newContract);
    toast.success('Contract created successfully!');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border-2 border-[#2A2A2A] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b-2 border-purple-500/30 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Create New Contract</h2>
                <p className="text-sm text-gray-400">
                  {step === 'method' && 'Choose how to create your contract'}
                  {step === 'select-quote' && 'Select an approved quote'}
                  {step === 'details' && 'Enter contract details'}
                  {step === 'terms' && 'Define payment terms'}
                  {step === 'review' && 'Review and create'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] flex items-center justify-center text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          {step !== 'method' && (
            <div className="flex items-center gap-2 mt-6">
              {['select-quote', 'details', 'terms', 'review'].map((s, idx) => {
                const stepIndex = ['select-quote', 'details', 'terms', 'review'].indexOf(step);
                const currentIndex = ['select-quote', 'details', 'terms', 'review'].indexOf(s);
                const isActive = currentIndex === stepIndex;
                const isComplete = currentIndex < stepIndex;
                
                return (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div className={`flex-1 h-1.5 rounded-full ${isComplete ? 'bg-purple-500' : isActive ? 'bg-purple-500/50' : 'bg-[#2A2A2A]'}`} />
                    {idx < 3 && <ChevronDown className="w-4 h-4 text-gray-600 rotate-[-90deg]" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Creation Method */}
          {step === 'method' && (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setCreationMethod('from-quote');
                  setStep('select-quote');
                }}
                className="w-full bg-[#1A1A1A] hover:bg-[#2A2A2A] border-2 border-[#2A2A2A] hover:border-purple-500/50 rounded-xl p-6 text-left transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <FileSignature className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">Create from Approved Quote</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      Select an approved quote and convert it into a contract with pre-filled details
                    </p>
                    <div className="inline-flex items-center gap-2 text-purple-400 font-semibold text-sm">
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setCreationMethod('from-scratch');
                  setStep('details');
                }}
                className="w-full bg-[#1A1A1A] hover:bg-[#2A2A2A] border-2 border-[#2A2A2A] hover:border-blue-500/50 rounded-xl p-6 text-left transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Plus className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">Create from Scratch</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      Start with a blank contract and enter all details manually
                    </p>
                    <div className="inline-flex items-center gap-2 text-blue-400 font-semibold text-sm">
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Select Quote (if from-quote method) */}
          {step === 'select-quote' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <p className="text-sm text-blue-300">
                  Select an approved quote to convert into a contract. Client details and amounts will be pre-filled.
                </p>
              </div>

              <div className="space-y-3">
                {approvedQuotes.map(quote => (
                  <button
                    key={quote.id}
                    onClick={() => handleQuoteSelect(quote)}
                    className="w-full bg-[#1A1A1A] hover:bg-[#2A2A2A] border-2 border-[#2A2A2A] hover:border-purple-500/50 rounded-xl p-5 text-left transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="font-mono text-sm text-purple-400 font-semibold">{quote.id}</p>
                          <h4 className="text-base font-bold text-white">{quote.title}</h4>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        quote.status === 'approved' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {quote.status.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {quote.client}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(quote.createdDate).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-green-400">
                        ${quote.amount.toLocaleString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Contract Details */}
          {step === 'details' && (
            <div className="space-y-6">
              {/* Contract Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  Contract Information
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Contract Title *
                    </label>
                    <input
                      type="text"
                      value={contractTitle}
                      onChange={(e) => setContractTitle(e.target.value)}
                      placeholder="e.g., HVAC Installation Service Agreement"
                      className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Contract Type *
                    </label>
                    <select
                      value={contractType}
                      onChange={(e) => setContractType(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="service">Service Agreement</option>
                      <option value="sales">Sales Contract</option>
                      <option value="nda">Non-Disclosure Agreement</option>
                      <option value="employment">Employment Contract</option>
                      <option value="vendor">Vendor Agreement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Contract Value ($) *
                    </label>
                    <input
                      type="number"
                      value={contractValue}
                      onChange={(e) => setContractValue(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Client Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-400" />
                  Client Information
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Client Name *
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="John Doe / Company Name"
                      className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="client@example.com"
                      className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      placeholder="123 Main St, City, State ZIP"
                      className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Contract Period */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-400" />
                  Contract Period
                </h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Assigned To *
                    </label>
                    <input
                      type="text"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      placeholder="Team member name"
                      className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Payment Terms */}
          {step === 'terms' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                <DollarSign className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <p className="text-sm text-orange-300">
                  Define how and when payments will be collected for this contract.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Payment Schedule</h3>
                
                <div className="space-y-2">
                  {[
                    { value: 'full', label: 'Full Payment', desc: 'Single payment upon signing' },
                    { value: 'deposit', label: 'Deposit + Final', desc: 'Deposit upfront, balance on completion' },
                    { value: 'milestone', label: 'Milestone Payments', desc: 'Multiple payments at project milestones' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setPaymentSchedule(option.value as any)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        paymentSchedule === option.value
                          ? 'bg-purple-500/20 border-purple-500'
                          : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-purple-500/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentSchedule === option.value
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-[#2A2A2A]'
                        }`}>
                          {paymentSchedule === option.value && (
                            <CheckCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white">{option.label}</p>
                          <p className="text-sm text-gray-400">{option.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {paymentSchedule === 'deposit' && (
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                    <label className="block text-sm font-semibold text-gray-300 mb-3">
                      Deposit Percentage: {depositPercentage}%
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="5"
                      value={depositPercentage}
                      onChange={(e) => setDepositPercentage(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>10%</span>
                      <span>50%</span>
                      <span>90%</span>
                    </div>
                  </div>
                )}

                {/* Payment Terms Preview */}
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
                  <div className="p-4 bg-[#0F0F0F] border-b border-[#2A2A2A]">
                    <h4 className="font-bold text-white">Payment Terms Preview</h4>
                  </div>
                  <div className="p-4 space-y-3">
                    {calculatePaymentTerms().map((term, idx) => (
                      <div key={term.id} className="flex items-center justify-between p-3 bg-[#0F0F0F] rounded-lg border border-[#2A2A2A]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center font-semibold border border-orange-500/30">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{term.description}</p>
                            <p className="text-sm text-gray-400">{term.dueDate}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">${term.amount.toFixed(2)}</p>
                          <p className="text-sm text-orange-400">{term.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-300">
                  Review all contract details before creating. You can edit the contract after creation.
                </p>
              </div>

              {/* Contract Summary */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
                <div className="p-4 bg-[#0F0F0F] border-b border-[#2A2A2A]">
                  <h3 className="font-bold text-white">Contract Summary</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Contract Title</p>
                      <p className="font-semibold text-white">{contractTitle}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Type</p>
                      <p className="font-semibold text-white capitalize">{contractType.replace('-', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Client</p>
                      <p className="font-semibold text-white">{clientName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Total Value</p>
                      <p className="text-xl font-bold text-green-400">${contractValue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Contract Period</p>
                      <p className="font-semibold text-white">
                        {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Assigned To</p>
                      <p className="font-semibold text-white">{assignedTo}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#2A2A2A]">
                    <p className="text-sm text-gray-400 mb-3">Payment Schedule: <span className="text-white font-semibold capitalize">{paymentSchedule}</span></p>
                    <div className="space-y-2">
                      {calculatePaymentTerms().map((term, idx) => (
                        <div key={term.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">{term.description} ({term.percentage}%)</span>
                          <span className="font-semibold text-white">${term.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-[#0F0F0F] border-t-2 border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (step === 'select-quote') setStep('method');
                else if (step === 'details') setStep(creationMethod === 'from-quote' ? 'select-quote' : 'method');
                else if (step === 'terms') setStep('details');
                else if (step === 'review') setStep('terms');
              }}
              disabled={step === 'method'}
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-gray-300 hover:text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-gray-300 hover:text-white rounded-lg font-semibold transition"
              >
                Cancel
              </button>

              {step === 'review' ? (
                <button
                  onClick={handleCreateContract}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-semibold transition flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Create Contract
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (step === 'method') return;
                    if (step === 'select-quote') return; // Quote selection handles its own navigation
                    if (step === 'details') {
                      if (!contractTitle || !clientName || !clientEmail || !contractValue || !startDate || !endDate || !assignedTo) {
                        toast.error('Please fill in all required fields');
                        return;
                      }
                      setStep('terms');
                    } else if (step === 'terms') {
                      setStep('review');
                    }
                  }}
                  disabled={step === 'method' || step === 'select-quote'}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
