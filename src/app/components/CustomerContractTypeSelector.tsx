/**
 * Customer Contract Type Selector
 * 
 * Shown to customer when they approve a quote
 * Lets them choose between Soroban Smart Contract or Standard Contract
 * Tracks selection and notifies admin
 */

import { useState } from 'react';
import {
  FileText, Sparkles, Shield, CheckCircle, X, AlertCircle,
  Lock, Zap, DollarSign, Clock, Users, TrendingUp, Award,
  ChevronRight, Info, Star, Package, Layers, Activity
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface CustomerContractTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  quoteNumber: string;
  quoteTotalAmount: number;
  customerName: string;
  projectTitle: string;
  onContractTypeSelected: (contractType: 'standard' | 'soroban-smart-contract', paymentScheduleType: string) => void;
}

export default function CustomerContractTypeSelector({
  isOpen,
  onClose,
  quoteNumber,
  quoteTotalAmount,
  customerName,
  projectTitle,
  onContractTypeSelected
}: CustomerContractTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<'standard' | 'soroban-smart-contract' | null>(null);
  const [selectedPaymentSchedule, setSelectedPaymentSchedule] = useState<string>('deposit-progress-final');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmSelection = () => {
    if (!selectedType) {
      toast.error('Please select a contract type');
      return;
    }

    onContractTypeSelected(selectedType, selectedPaymentSchedule);
    toast.success('Contract type selected! Your contract will be generated shortly.');
    onClose();
  };

  const handleSkip = () => {
    toast.info('You can select contract type later from your customer portal');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-[#1A1A1A] rounded-2xl border-2 border-[#2A2A2A] max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
              Quote Approved!
            </h2>
            <p className="text-gray-400">Now choose your preferred contract type</p>
          </div>
          <button
            onClick={handleSkip}
            className="w-10 h-10 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] flex items-center justify-center hover:bg-[#2A2A2A] transition text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quote Summary */}
        <div className="p-6 border-b border-[#2A2A2A]">
          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Quote Number</p>
                <p className="text-sm font-bold text-white">{quoteNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Project</p>
                <p className="text-sm font-bold text-white">{projectTitle}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                <p className="text-sm font-bold text-green-400">
                  ${quoteTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Type Selection */}
        <div className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">Choose Your Contract Type</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Standard Contract */}
            <button
              onClick={() => setSelectedType('standard')}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                selectedType === 'standard'
                  ? 'border-[#ea580c] bg-[#ea580c]/10'
                  : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#ea580c]/50'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                {selectedType === 'standard' && (
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              <h3 className="text-xl font-bold text-white mb-2">Standard Contract</h3>
              <p className="text-sm text-gray-400 mb-4">
                Traditional state-approved contract with flexible payment options
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>State-approved legal template</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Flexible payment schedules</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Traditional paper or digital signature</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Easy to understand terms</span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails(showDetails === 'standard' ? null : 'standard');
                }}
                className="text-xs text-[#ea580c] hover:underline flex items-center gap-1"
              >
                <Info className="w-3 h-3" />
                Learn more about Standard Contracts
              </button>

              {showDetails === 'standard' && (
                <div className="mt-4 p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                  <p className="text-xs text-gray-400 mb-2">
                    <strong className="text-white">Standard Contract Details:</strong>
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                    <li>Legally binding contract approved by state authorities</li>
                    <li>Clear terms and conditions</li>
                    <li>Choose from multiple payment schedules</li>
                    <li>1-year workmanship warranty included</li>
                    <li>Traditional dispute resolution</li>
                    <li>Can be signed digitally or on paper</li>
                  </ul>
                </div>
              )}
            </button>

            {/* Soroban Smart Contract */}
            <button
              onClick={() => setSelectedType('soroban-smart-contract')}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                selectedType === 'soroban-smart-contract'
                  ? 'border-[#ea580c] bg-[#ea580c]/10'
                  : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#ea580c]/50'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                {selectedType === 'soroban-smart-contract' && (
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                Soroban Smart Contract
                <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 text-xs rounded-full border border-purple-500/30">
                  RECOMMENDED
                </span>
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Blockchain-based contract with automated payments and full transparency
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <Zap className="w-4 h-4" />
                  <span>Automated milestone payments</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <Shield className="w-4 h-4" />
                  <span>Funds held in secure escrow</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <Lock className="w-4 h-4" />
                  <span>Immutable blockchain record</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>Real-time project tracking</span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails(showDetails === 'soroban' ? null : 'soroban');
                }}
                className="text-xs text-[#ea580c] hover:underline flex items-center gap-1"
              >
                <Info className="w-3 h-3" />
                Learn more about Smart Contracts
              </button>

              {showDetails === 'soroban' && (
                <div className="mt-4 p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                  <p className="text-xs text-gray-400 mb-2">
                    <strong className="text-white">Smart Contract Details:</strong>
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                    <li>Powered by Soroban blockchain (Stellar network)</li>
                    <li>Payments released automatically when milestones verified</li>
                    <li>All project progress recorded on blockchain</li>
                    <li>Photo/video evidence stored on IPFS</li>
                    <li>Dispute resolution through smart contract arbitration</li>
                    <li>Full transparency - track every payment and milestone</li>
                    <li>Lower fees than traditional escrow services</li>
                  </ul>
                </div>
              )}
            </button>
          </div>

          {/* Payment Schedule (for Standard Contract) */}
          {selectedType === 'standard' && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-white mb-3">Choose Payment Schedule</h4>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedPaymentSchedule('deposit-progress-final')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedPaymentSchedule === 'deposit-progress-final'
                      ? 'border-[#ea580c] bg-[#ea580c]/5'
                      : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#ea580c]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white mb-1">3-Payment Schedule (Recommended)</p>
                      <p className="text-xs text-gray-400">30% Deposit • 40% Progress • 30% Final</p>
                    </div>
                    {selectedPaymentSchedule === 'deposit-progress-final' && (
                      <CheckCircle className="w-5 h-5 text-[#ea580c]" />
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setSelectedPaymentSchedule('deposit-final')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedPaymentSchedule === 'deposit-final'
                      ? 'border-[#ea580c] bg-[#ea580c]/5'
                      : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#ea580c]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white mb-1">2-Payment Schedule</p>
                      <p className="text-xs text-gray-400">50% Deposit • 50% Upon Completion</p>
                    </div>
                    {selectedPaymentSchedule === 'deposit-final' && (
                      <CheckCircle className="w-5 h-5 text-[#ea580c]" />
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setSelectedPaymentSchedule('milestone')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedPaymentSchedule === 'milestone'
                      ? 'border-[#ea580c] bg-[#ea580c]/5'
                      : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#ea580c]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white mb-1">Milestone-Based Schedule</p>
                      <p className="text-xs text-gray-400">Payments released at specific project milestones</p>
                    </div>
                    {selectedPaymentSchedule === 'milestone' && (
                      <CheckCircle className="w-5 h-5 text-[#ea580c]" />
                    )}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Smart Contract Payment Info */}
          {selectedType === 'soroban-smart-contract' && (
            <div className="mb-6 p-4 bg-purple-600/10 border border-purple-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-purple-400 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white mb-1">Smart Contract Payment Schedule</p>
                  <p className="text-xs text-gray-400 mb-2">
                    Payments are automatically calculated based on project milestones:
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                    <li>25% Initial deposit (contract execution)</li>
                    <li>15% Demolition/site prep complete</li>
                    <li>20% Rough-in work inspected</li>
                    <li>20% Installation complete</li>
                    <li>20% Final inspection & customer approval</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Benefits Comparison */}
          <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4 mb-6">
            <h4 className="text-sm font-bold text-white mb-3">Why Choose Smart Contract?</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-xs font-bold text-white mb-1">Protected</p>
                <p className="text-xs text-gray-400">Funds in secure escrow until work approved</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-xs font-bold text-white mb-1">Automated</p>
                <p className="text-xs text-gray-400">Payments released automatically at milestones</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Activity className="w-6 h-6 text-purple-400" />
                </div>
                <p className="text-xs font-bold text-white mb-1">Transparent</p>
                <p className="text-xs text-gray-400">Track every milestone on blockchain</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-[#1A1A1A] border-t border-[#2A2A2A] p-6 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="px-6 py-3 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 rounded-xl hover:bg-[#2A2A2A] transition font-medium"
          >
            I'll Decide Later
          </button>

          <div className="flex items-center gap-3">
            <div className="text-right mr-4">
              <p className="text-xs text-gray-500">Contract Total</p>
              <p className="text-2xl font-bold text-white">
                ${quoteTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <button
              onClick={handleConfirmSelection}
              disabled={!selectedType}
              className={`px-8 py-3 rounded-xl font-bold transition flex items-center gap-2 ${
                selectedType
                  ? 'bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white hover:from-[#c2410c] hover:to-[#ea580c]'
                  : 'bg-[#2A2A2A] text-gray-600 cursor-not-allowed'
              }`}
            >
              Confirm Selection
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
